"use client";

import { UserProvider } from "@/context/UserContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Inner component so hooks can run inside the UserProvider tree
function AppBootstrap({ children }: { children: React.ReactNode }) {
  // Registers FCM device token on every app launch (no-op on web)
  usePushNotifications();
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AppBootstrap>{children}</AppBootstrap>
    </UserProvider>
  );
}
