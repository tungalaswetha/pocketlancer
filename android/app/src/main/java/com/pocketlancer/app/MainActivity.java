package com.pocketlancer.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_CODE = 1001;

    // ── JS injected into every page on start ───────────────────────────────
    // PURPOSE: Fix Razorpay payment failures on Android WebView.
    //
    // ROOT CAUSE: Razorpay's checkout.js creates a cross-origin iframe at
    //   checkout.razorpay.com. For that iframe to read device sensors
    //   (accelerometer/gyroscope) used in fraud detection, the iframe element
    //   MUST have an explicit allow="accelerometer; gyroscope; ..." attribute.
    //
    //   The HTTP Permissions-Policy header we set in next.config.ts
    //   (accelerometer=*) only defines which origins are ALLOWED to have
    //   access — it does NOT auto-delegate to iframes. The iframe still needs
    //   the allow attribute. Since Razorpay creates its iframe dynamically,
    //   we cannot add the attribute in HTML. Instead we use a MutationObserver
    //   to intercept every iframe the moment it is added to the DOM and inject
    //   the allow attribute before Razorpay's code tries to read the sensors.
    //
    // RESULT: Razorpay's POST to /v1/standard_checkout/payments/validate/account
    //   returns 200 instead of 500, and all payment methods work.
    private static final String RAZORPAY_IFRAME_FIX_JS =
            "(function() {" +
                    "  var SENSORS = 'accelerometer; gyroscope; magnetometer; payment; camera; microphone';" +
                    "  function patchIframe(el) {" +
                    "    if (!el || el.tagName !== 'IFRAME') return;" +
                    "    var cur = el.getAttribute('allow') || '';" +
                    "    if (cur.indexOf('accelerometer') !== -1) return;" +
                    "    el.setAttribute('allow', cur ? cur + '; ' + SENSORS : SENSORS);" +
                    "  }" +
                    "  var obs = new MutationObserver(function(muts) {" +
                    "    for (var i = 0; i < muts.length; i++) {" +
                    "      var nodes = muts[i].addedNodes;" +
                    "      for (var j = 0; j < nodes.length; j++) {" +
                    "        var n = nodes[j];" +
                    "        patchIframe(n);" +
                    "        if (n.querySelectorAll) {" +
                    "          var iframes = n.querySelectorAll('iframe');" +
                    "          for (var k = 0; k < iframes.length; k++) patchIframe(iframes[k]);" +
                    "        }" +
                    "      }" +
                    "    }" +
                    "  });" +
                    "  obs.observe(document.documentElement, { childList: true, subtree: true });" +
                    "  document.querySelectorAll('iframe').forEach(patchIframe);" +
                    "})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        super.onCreate(savedInstanceState);

        WebView.setWebContentsDebuggingEnabled(true);
        disableWebViewDarkMode();
        fixWebViewForRazorpay();

        // ✅ Only request POST_NOTIFICATIONS at launch (required for Android 13+).
        //    Location permission is intentionally NOT requested here — it is
        //    requested contextually from the search page via our custom modal,
        //    which explains to the user WHY we need it. Asking at app-launch
        //    would cause the OS dialog to appear before the user reaches the
        //    search page, meaning our LocationPermissionModal never shows.
        requestNotificationPermission();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() == null || getBridge().getWebView() == null) return;
                WebView webView = getBridge().getWebView();
                if (webView.canGoBack()) {
                    webView.goBack();
                }
            }
        });
    }

    // ── JavaScript Interface ───────────────────────────────────────────────
    // Exposed to JS as window.AndroidBridge
    // Allows React code to call native Android APIs.
    public class LocationBridge {

        // Called from React when GPS is off but app permission is granted.
        // Opens the device's Location Settings screen so the user can turn GPS on.
        @JavascriptInterface
        public void openLocationSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (ActivityNotFoundException ignored) {}
        }

        // Returns true if device location services (GPS) are enabled.
        // Call this from React to decide whether to show "GPS is off" guidance.
        @JavascriptInterface
        public boolean isLocationEnabled() {
            LocationManager lm =
                    (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return false;
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        }
    }

    private void fixWebViewForRazorpay() {
        if (getBridge() == null || getBridge().getWebView() == null) return;

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // ── Expose native bridge to JS ────────────────────────────────────
        webView.addJavascriptInterface(new LocationBridge(), "AndroidBridge");

        // ── Strip "; wv" from User-Agent ──────────────────────────────────
        // Razorpay's fraud engine flags WebView UAs and returns HTTP 500 on
        // /validate/account. Removing "; wv" makes it behave like Chrome.
        String ua = settings.getUserAgentString();
        String cleanUA = ua.replace("; wv", "").replace(" wv ", " ").trim();
        settings.setUserAgentString(cleanUA);

        // ── WebSettings required by Razorpay checkout.js ─────────────────
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(true);

        // ── Subclass BridgeWebViewClient ──────────────────────────────────
        // We extend BridgeWebViewClient (not plain WebViewClient) so that
        // onPageFinished → bridge.reset() still runs. That drains the native→JS
        // callback queue that PushNotifications.register() depends on.
        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {

            // Inject the iframe-allow patch at the very start of every page
            // load, before any scripts on the page (including Razorpay's) run.
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                view.evaluateJavascript(RAZORPAY_IFRAME_FIX_JS, null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view, WebResourceRequest request) {

                Uri uri = request.getUrl();
                String scheme = uri != null ? uri.getScheme() : null;
                if (scheme == null) {
                    return super.shouldOverrideUrlLoading(view, request);
                }

                switch (scheme) {
                    case "https":
                    case "http":
                        return super.shouldOverrideUrlLoading(view, request);

                    case "intent": {
                        // GPay, PhonePe, Paytm UPI deep-links from Razorpay
                        try {
                            Intent intent = Intent.parseUri(
                                    uri.toString(), Intent.URI_INTENT_SCHEME);
                            intent.addCategory(Intent.CATEGORY_BROWSABLE);
                            startActivity(intent);
                        } catch (ActivityNotFoundException e) {
                            String raw = uri.toString();
                            int pkgIdx = raw.indexOf("package=");
                            if (pkgIdx >= 0) {
                                int end = raw.indexOf(";", pkgIdx);
                                String pkg = raw.substring(pkgIdx + 8,
                                        end < 0 ? raw.length() : end);
                                try {
                                    startActivity(new Intent(Intent.ACTION_VIEW,
                                            Uri.parse("market://details?id=" + pkg)));
                                } catch (ActivityNotFoundException ignored) {}
                            }
                        } catch (Exception ignored) {}
                        return true;
                    }

                    case "upi": {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (ActivityNotFoundException ignored) {}
                        return true;
                    }

                    case "tel": {
                        try {
                            startActivity(new Intent(Intent.ACTION_DIAL, uri));
                        } catch (ActivityNotFoundException ignored) {}
                        return true;
                    }

                    case "mailto": {
                        try {
                            startActivity(new Intent(Intent.ACTION_SENDTO, uri));
                        } catch (ActivityNotFoundException ignored) {}
                        return true;
                    }

                    default:
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (ActivityNotFoundException ignored) {}
                        return true;
                }
            }
        });
    }

    // Only request the notification permission at launch (Android 13+).
    // Location is handled contextually from the search page.
    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        this,
                        new String[]{ Manifest.permission.POST_NOTIFICATIONS },
                        PERMISSION_REQUEST_CODE);
            }
        }
    }

    private void disableWebViewDarkMode() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebSettings settings = getBridge().getWebView().getSettings();
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        }
    }
}