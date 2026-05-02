# Keep WebView JS interface — REQUIRED for Capacitor bridge to work if minification is ever enabled
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor bridge classes
-keep class com.getcapacitor.** { *; }
-keep class com.pocketlancer.app.** { *; }

# Keep source file names for readable stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
