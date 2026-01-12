import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { useBackgroundCleanup } from "@/hooks/useBackgroundCleanup";
import { useHistoryPrefetch } from "@/hooks/useHistoryPrefetch";
import { useNotificationInit } from "@/hooks/useNotificationInit";
import { initializeRevenueCat } from "@/hooks/useRevenueCat";
import { View, ActivityIndicator, Text } from "react-native";

SplashScreen.preventAutoHideAsync();

// ==================== CRITICAL: INITIALIZE REVENUECAT FIRST ====================
// This runs ONCE at module load time, BEFORE any React components mount
// This ensures Purchases.configure() is called before any subscription methods
console.log(
  "🔥 [_layout.jsx] Module loaded - starting RevenueCat initialization",
);
let revenueCatInitPromise = null;
let revenueCatReady = false;

// Start initialization immediately (synchronously at module level)
revenueCatInitPromise = initializeRevenueCat()
  .then(() => {
    console.log(
      "✅ [_layout.jsx] RevenueCat initialization complete at module level",
    );
    revenueCatReady = true;
  })
  .catch((err) => {
    console.warn(
      "⚠️ [_layout.jsx] RevenueCat initialization failed (non-critical):",
      err.message,
    );
    revenueCatReady = true; // Still mark as ready so app doesn't hang
  });
// ===============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutContent() {
  const { initiate, isReady, auth } = useAuth();
  const queryClientInstance = useQueryClient();
  const userId = auth?.user?.id;
  const [rcReady, setRcReady] = useState(revenueCatReady);

  // Wait for RevenueCat to finish initializing (should be fast since it started at module load)
  useEffect(() => {
    if (!rcReady && revenueCatInitPromise) {
      console.log(
        "⏳ [ROOT LAYOUT] Waiting for RevenueCat initialization to complete...",
      );
      revenueCatInitPromise.finally(() => {
        console.log("✅ [ROOT LAYOUT] RevenueCat ready");
        setRcReady(true);
      });
    }
  }, [rcReady]);

  // Run background cleanup once per day
  useBackgroundCleanup();

  // Prefetch history data on app open
  useHistoryPrefetch();

  // Initialize notifications on app startup
  useNotificationInit();

  useEffect(() => {
    initiate();
  }, [initiate]);

  // Hide splash when auth AND RevenueCat are ready
  useEffect(() => {
    if (isReady && rcReady) {
      console.log("✅ [ROOT LAYOUT] Auth and RevenueCat ready, hiding splash");
      SplashScreen.hideAsync();
    }
  }, [isReady, rcReady]);

  // Invalidate all queries when user changes or logs out
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(
      `[ROOT LAYOUT ${timestamp}] Auth state changed, clearing React Query cache`,
      {
        userId,
        isAuthenticated: !!auth,
      },
    );

    // Clear all cached queries when auth changes
    queryClientInstance.clear();
    console.log(`[ROOT LAYOUT ${timestamp}] ✓ React Query cache cleared`);
  }, [userId, queryClientInstance, auth]);

  // Show loading screen until both auth and RevenueCat are ready
  if (!isReady || !rcReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F172A",
        }}
      >
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={{ color: "#94A3B8", marginTop: 16, fontSize: 16 }}>
          {!rcReady ? "Initializing..." : "Loading..."}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <AuthModal />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutContent />
    </QueryClientProvider>
  );
}
