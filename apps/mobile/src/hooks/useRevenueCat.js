import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

// Global initialization state
let isInitialized = false;
let initializationPromise = null;

/**
 * Initialize RevenueCat once globally
 * This ensures we only configure RevenueCat once across the entire app
 */
async function initializeRevenueCat() {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Already initialized
  if (isInitialized) {
    return Promise.resolve();
  }

  // Skip on web
  if (Platform.OS === "web") {
    console.log("⏩ Skipping RevenueCat on web");
    isInitialized = true;
    return Promise.resolve();
  }

  // Get API key
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY;

  if (!apiKey) {
    throw new Error(
      "EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY is not configured. Please add it to your environment variables.",
    );
  }

  // Create initialization promise
  initializationPromise = (async () => {
    try {
      console.log("🔧 Initializing RevenueCat...");
      console.log("🔧 Platform:", Platform.OS);

      // Configure RevenueCat
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      await Purchases.configure({ apiKey });

      isInitialized = true;
      console.log("✅ RevenueCat initialized successfully");
    } catch (error) {
      console.error("❌ RevenueCat initialization failed:", error);
      initializationPromise = null; // Allow retry on next attempt
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Hook for using RevenueCat in Expo Dev Client
 * Provides subscription management and user entitlements
 */
export function useRevenueCat() {
  const [customerInfo, setCustomerInfo] = useState(null);
  const [offerings, setOfferings] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Initialize on mount
  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      try {
        // Initialize RevenueCat
        await initializeRevenueCat();

        if (!isMounted.current) return;

        // Skip customer info fetch on web
        if (Platform.OS === "web") {
          setIsReady(true);
          return;
        }

        // Fetch initial customer info
        console.log("📡 Fetching customer info...");
        const info = await Purchases.getCustomerInfo();

        if (!isMounted.current) return;

        console.log("✅ Customer info fetched successfully");
        setCustomerInfo(info);

        // Check for active subscription
        const hasActiveSubscription =
          info?.entitlements?.active?.access !== undefined;
        setHasAccess(hasActiveSubscription);
        setIsReady(true);

        console.log("✅ RevenueCat ready, hasAccess:", hasActiveSubscription);
      } catch (err) {
        if (!isMounted.current) return;

        console.error("❌ RevenueCat initialization error:", err);
        setError(err.message || "Failed to initialize RevenueCat");
        setIsReady(true); // Set ready even on error so app doesn't hang
      }
    };

    init();

    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Identify user with RevenueCat
   * Call this after authentication to link the user's account
   */
  const identifyUser = async (userId) => {
    if (!userId) {
      const error = "userId is required";
      console.warn("⚠️ Cannot identify user:", error);
      return { success: false, error };
    }

    if (Platform.OS === "web") {
      console.log("⏩ Skipping user identification on web");
      return { success: true };
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log(`🔑 Identifying user with RevenueCat: ${userId}`);

      const { customerInfo: info } = await Purchases.logIn(String(userId));

      if (isMounted.current) {
        setCustomerInfo(info);
        const hasActiveSubscription =
          info?.entitlements?.active?.access !== undefined;
        setHasAccess(hasActiveSubscription);
        console.log("✅ User identified successfully");
      }

      return { success: true, customerInfo: info };
    } catch (err) {
      console.error("❌ Error identifying user:", err);
      if (isMounted.current) {
        setError(err.message || "Failed to identify user");
      }
      return { success: false, error: err.message };
    }
  };

  /**
   * Fetch latest customer info
   * Use this to refresh subscription status
   */
  const fetchCustomerInfo = async () => {
    if (Platform.OS === "web") {
      return null;
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log("📡 Fetching customer info...");
      const info = await Purchases.getCustomerInfo();

      if (isMounted.current) {
        setCustomerInfo(info);
        const hasActiveSubscription =
          info?.entitlements?.active?.access !== undefined;
        setHasAccess(hasActiveSubscription);
        console.log("✅ Customer info updated");
      }

      return info;
    } catch (err) {
      console.error("❌ Error fetching customer info:", err);
      if (isMounted.current) {
        setError(err.message || "Failed to fetch customer info");
      }
      return null;
    }
  };

  /**
   * Fetch available subscription offerings
   * Call this to get the list of available subscription packages
   */
  const fetchOfferings = async () => {
    if (Platform.OS === "web") {
      return null;
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log("📡 Fetching offerings...");
      const offerings = await Purchases.getOfferings();

      if (isMounted.current) {
        setOfferings(offerings);
        console.log("✅ Offerings fetched successfully");
      }

      return offerings;
    } catch (err) {
      console.error("❌ Error fetching offerings:", err);
      if (isMounted.current) {
        setError(err.message || "Failed to fetch offerings");
      }
      return null;
    }
  };

  /**
   * Purchase a subscription package
   * Call this when user selects a subscription plan
   */
  const purchasePackage = async (pkg) => {
    if (Platform.OS === "web") {
      return { success: false, error: "Purchases not available on web" };
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log("💳 Starting purchase...");
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);

      if (isMounted.current) {
        setCustomerInfo(info);
        const hasActiveSubscription =
          info?.entitlements?.active?.access !== undefined;
        setHasAccess(hasActiveSubscription);
        console.log("✅ Purchase successful");
      }

      return { success: true, customerInfo: info };
    } catch (err) {
      // User cancelled the purchase
      if (err.userCancelled) {
        console.log("ℹ️ User cancelled purchase");
        return { success: false, cancelled: true };
      }

      console.error("❌ Purchase error:", err);
      if (isMounted.current) {
        setError(err.message || "Purchase failed");
      }
      return { success: false, error: err.message };
    }
  };

  /**
   * Restore previous purchases
   * Call this to restore subscriptions from App Store/Play Store
   */
  const restorePurchases = async () => {
    if (Platform.OS === "web") {
      return { success: false, error: "Restore not available on web" };
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log("🔄 Restoring purchases...");
      const info = await Purchases.restorePurchases();

      if (isMounted.current) {
        setCustomerInfo(info);
        const hasActiveSubscription =
          info?.entitlements?.active?.access !== undefined;
        setHasAccess(hasActiveSubscription);
        console.log("✅ Purchases restored");
      }

      return { success: true, customerInfo: info };
    } catch (err) {
      console.error("❌ Restore error:", err);
      if (isMounted.current) {
        setError(err.message || "Failed to restore purchases");
      }
      return { success: false, error: err.message };
    }
  };

  /**
   * Log out current user from RevenueCat
   * Call this when user signs out of your app
   */
  const logOut = async () => {
    if (Platform.OS === "web") {
      return { success: true };
    }

    try {
      // Ensure RevenueCat is initialized
      await initializeRevenueCat();

      console.log("👋 Logging out from RevenueCat...");
      const info = await Purchases.logOut();

      if (isMounted.current) {
        setCustomerInfo(info);
        setHasAccess(false);
        console.log("✅ Logged out successfully");
      }

      return { success: true, customerInfo: info };
    } catch (err) {
      console.error("❌ Logout error:", err);
      if (isMounted.current) {
        setError(err.message || "Failed to log out");
      }
      return { success: false, error: err.message };
    }
  };

  return {
    // State
    customerInfo,
    offerings,
    isReady,
    hasAccess,
    error,

    // Actions
    identifyUser,
    fetchCustomerInfo,
    fetchOfferings,
    purchasePackage,
    restorePurchases,
    logOut,

    // Status
    isInitialized,
  };
}

// Export the initialization function in case it's needed elsewhere
export { initializeRevenueCat };
