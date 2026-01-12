import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";

export function useSubscriptionGate() {
  const { isAuthenticated, isReady: authReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!authReady) {
      setIsReady(false);
      return;
    }

    setIsReady(true);

    // Not authenticated - allow access to auth screens
    if (!isAuthenticated) {
      const inAuthGroup = segments[0] === "account";
      const onWelcome = segments[0] === "welcome";
      if (!inAuthGroup && !onWelcome) {
        router.replace("/welcome");
      }
      return;
    }

    // Authenticated - allow access to app (no subscription check)
    const inAuthGroup = segments[0] === "account";
    const onWelcome = segments[0] === "welcome";

    if (inAuthGroup || onWelcome) {
      router.replace("/");
    }
  }, [isAuthenticated, authReady, segments]);

  return {
    isReady,
    isAuthenticated,
    hasAccess: true, // Always has access now
    loading: !authReady,
  };
}
