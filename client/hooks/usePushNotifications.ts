// client/hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";

export function usePushNotifications() {
  const { user, loading } = useUser();
  const setupDoneRef = useRef(false);

  useEffect(() => {
    if (loading || !user) {
      setupDoneRef.current = false;
      return;
    }
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    const setup = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } =
          await import("@capacitor/push-notifications");
        const { default: api } = await import("@/services/api");

        await PushNotifications.removeAllListeners();

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") {
          console.log("[FCM] Push permission denied");
          return;
        }

        // ── Add ALL listeners before calling register() ───────────────────
        // Capacitor fires "registration" asynchronously after register() is
        // called. If the listener is added after register() the event can
        // fire into a void and the token is never saved to the server.

        let registered = false;

        await PushNotifications.addListener("registration", async (token) => {
          if (registered) return;
          registered = true;
          console.log("[FCM] Token received:", user._id);
          try {
            await api.post("/notifications/register-token", {
              fcmToken: token.value,
              platform: Capacitor.getPlatform(),
            });
            console.log("[FCM] Token saved ✓");
          } catch (err: any) {
            console.warn("[FCM] Token save failed:", err?.message);
          }
        });

        // ── registrationError fires if Firebase can't get a token ─────────
        // This is a non-fatal error — the app works fine without push tokens.
        // We log it and continue rather than throwing.
        await PushNotifications.addListener("registrationError", (err) => {
          console.warn(
            "[FCM] Registration error — push notifications disabled.",
            JSON.stringify(err),
          );
        });

        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[FCM] Foreground:", notification.title);
          },
        );

        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification?.data ?? {};
            const link: string = data?.link || "/";
            const type: string = data?.type || "";

            setTimeout(() => {
              if (type === "message_received" && data?.senderId) {
                window.dispatchEvent(
                  new CustomEvent("open-chat", {
                    detail: {
                      userId: data.senderId,
                      name: data.senderName || "Chat",
                    },
                  }),
                );
              } else if (link && link !== "/messages" && link !== "/") {
                window.location.href = link;
              }
            }, 500);
          },
        );

        // ── Small delay before register() ────────────────────────────────
        // Firebase's ContentProvider initializes Firebase during Application
        // onCreate, which runs before MainActivity.onCreate. However on some
        // devices there is a brief window where Firebase is technically
        // "initialized" but its internal token cache isn't ready. A 300ms
        // delay ensures the native side is fully settled before we trigger
        // the FCM token request. This prevents the background-thread race
        // that causes an uncaught IllegalStateException crash.
        await new Promise((resolve) => setTimeout(resolve, 300));

        // ── register() is isolated — its failure must NEVER crash the app ─
        // If Firebase throws on the background thread, Capacitor can't
        // propagate it through the bridge. We use a Promise race with a
        // 10-second timeout so a hanging register() doesn't block anything.
        // The registrationError listener above handles Firebase-level errors.
        await Promise.race([
          PushNotifications.register(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("register() timed out")), 10_000),
          ),
        ]).catch((err) => {
          // Non-fatal — push notifications won't work but app is unaffected
          console.warn("[FCM] register() failed or timed out:", err?.message);
        });
      } catch (err: any) {
        if (
          err?.message?.toLowerCase().includes("not implemented") ||
          err?.message?.toLowerCase().includes("native")
        ) {
          console.log("[FCM] Not running in native app, skipped");
        } else {
          console.warn("[FCM] Push setup failed (non-fatal):", err?.message);
        }
      }
    };

    setup();

    return () => {
      import("@capacitor/push-notifications")
        .then(({ PushNotifications }) => PushNotifications.removeAllListeners())
        .catch(() => {});
    };
  }, [user?._id, loading]); // eslint-disable-line
}
