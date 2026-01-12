/**
 * useIAP Hook - Replacement for useRevenueCat
 * Manages subscription state using react-native-iap + backend verification
 */

import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/utils/auth/useAuth";
import * as IAPService from "@/services/iap";

export function useIAP() {
  const { isAuthenticated, isReady: authReady } = useAuth();

  const [isReady, setIsReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailedError, setDetailedError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isModuleAvailable, setIsModuleAvailable] = useState(
    IAPService.isModuleAvailable,
  );

  // Check if running in Expo Go (StoreKit won't work)
  const isExpoGo = Platform.OS !== "web" && !Platform.constants?.isDevice;

  // Initialize IAP system
  useEffect(() => {
    async function init() {
      if (Platform.OS !== "ios") {
        console.log("[useIAP] Skipping - not iOS");
        setIsReady(true);
        setLoading(false);
        return;
      }

      if (isExpoGo) {
        console.log("[useIAP] Skipping - running in Expo Go");
        setIsReady(true);
        setLoading(false);
        setError("StoreKit not available in Expo Go");
        return;
      }

      console.log("[useIAP] Initializing IAP...");

      const initResult = await IAPService.initializeIAP();

      if (initResult.success) {
        setIsInitialized(true);

        // Setup purchase listeners
        IAPService.setupPurchaseListeners(
          handlePurchaseSuccess,
          handlePurchaseError,
        );

        // Fetch products
        const productsResult = await IAPService.getProducts();
        if (productsResult.success) {
          setProducts(productsResult.products);
          console.log(
            "[useIAP] Products loaded:",
            Object.keys(productsResult.products),
          );
        } else {
          setError(productsResult.error);
          setDetailedError({
            step: "PRODUCT_FETCH",
            error: productsResult.error,
          });
        }

        setIsReady(true);
      } else {
        setError(initResult.error || initResult.reason);
        setDetailedError({
          step: "INITIALIZATION",
          error: initResult,
        });
        setIsReady(true);
      }

      setLoading(false);
    }

    if (authReady) {
      init();
    }

    return () => {
      IAPService.teardown();
    };
  }, [authReady, isExpoGo]);

  // Check entitlement when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isReady && !isExpoGo) {
      checkEntitlement();
    }
  }, [isAuthenticated, isReady, isExpoGo]);

  // Purchase success handler
  const handlePurchaseSuccess = useCallback(async (purchase) => {
    console.log("[useIAP] Purchase successful:", purchase.productId);

    // Refresh entitlement from backend
    await checkEntitlement();
  }, []);

  // Purchase error handler
  const handlePurchaseError = useCallback((error) => {
    console.error("[useIAP] Purchase error:", error);
    setError(error.message || "Purchase failed");
    setDetailedError({
      step: "PURCHASE",
      error: error,
    });
  }, []);

  // Check entitlement from backend
  const checkEntitlement = useCallback(async () => {
    console.log("[useIAP] Checking entitlement...");

    const result = await IAPService.getEntitlement();

    if (result.success) {
      setIsPremium(result.isPremium);
      console.log("[useIAP] Entitlement updated:", result.isPremium);
    } else {
      console.error("[useIAP] Failed to check entitlement:", result.error);
      setIsPremium(false);
    }

    return result;
  }, []);

  // Purchase a product
  const purchaseProduct = useCallback(async (productId) => {
    console.log("[useIAP] Starting purchase:", productId);
    setError(null);

    const result = await IAPService.purchaseProduct(productId);

    if (result.success) {
      // Purchase initiated, wait for listener to handle completion
      console.log("[useIAP] Purchase initiated");
      return { success: true };
    } else if (result.cancelled) {
      console.log("[useIAP] Purchase cancelled by user");
      return { success: false, cancelled: true };
    } else {
      console.error("[useIAP] Purchase failed:", result.error);
      setError(result.error);
      return { success: false, error: result.error };
    }
  }, []);

  // Restore purchases
  const restore = useCallback(async () => {
    console.log("[useIAP] Restoring purchases...");
    setError(null);

    const result = await IAPService.restorePurchases();

    if (result.success && result.restored) {
      // Refresh entitlement
      await checkEntitlement();
      return { success: true, restored: true };
    } else if (result.success && !result.restored) {
      return { success: true, restored: false, message: result.message };
    } else {
      setError(result.error);
      return { success: false, error: result.error };
    }
  }, [checkEntitlement]);

  // Fetch products (for retry)
  const fetchProducts = useCallback(async () => {
    const result = await IAPService.getProducts();
    if (result.success) {
      setProducts(result.products);
    }
    return result;
  }, []);

  return {
    // State
    isReady,
    isPremium,
    loading,
    error,
    detailedError,
    isInitialized,
    isModuleAvailable,
    isExpoGo,

    // Products
    products,
    monthlyProduct: products?.monthly,
    yearlyProduct: products?.yearly,

    // Actions
    purchaseProduct,
    restore,
    checkEntitlement,
    fetchProducts,

    // Compatibility with old useRevenueCat API
    hasAccess: isPremium,
    restorePurchases: restore,
    fetchOfferings: fetchProducts,
    purchasePackage: async (pkg) => {
      if (pkg?.product?.productId) {
        return await purchaseProduct(pkg.product.productId);
      }
      return { success: false, error: "Invalid package" };
    },
    offerings: products
      ? { current: { availablePackages: products.all } }
      : null,
  };
}
