/**
 * IAP Service - Direct Apple StoreKit integration via react-native-iap
 *
 * Products (from App Store Connect):
 * - waterai_smarthydration_monthly: $2.99/month (1-week free trial)
 * - waterai_smarthydration_yearly: $19.99/year (no trial)
 */

import { Platform, NativeModules, NativeEventEmitter } from "react-native";

let RNIap = null;
let isModuleAvailable = false;

// Dynamically import react-native-iap (will fail gracefully if not installed)
try {
  RNIap = require("react-native-iap");
  isModuleAvailable = true;
  console.log("[IAP] react-native-iap module loaded successfully");
} catch (error) {
  console.warn("[IAP] react-native-iap not available:", error.message);
  isModuleAvailable = false;
}

// Product SKUs from App Store Connect
export const PRODUCT_SKUS = {
  MONTHLY: "waterai_smarthydration_monthly",
  YEARLY: "waterai_smarthydration_yearly",
};

const SUBSCRIPTION_SKUS = [PRODUCT_SKUS.MONTHLY, PRODUCT_SKUS.YEARLY];

// Singleton state
let isInitialized = false;
let purchaseUpdateListener = null;
let purchaseErrorListener = null;

/**
 * Initialize IAP connection
 */
export async function initializeIAP() {
  if (Platform.OS !== "ios") {
    console.log("[IAP] Skipping - not iOS");
    return { success: false, reason: "not_ios" };
  }

  if (!isModuleAvailable || !RNIap) {
    console.error("[IAP] Module not available");
    return { success: false, reason: "module_not_available" };
  }

  if (isInitialized) {
    console.log("[IAP] Already initialized");
    return { success: true };
  }

  try {
    console.log("[IAP] Initializing connection...");

    // Initialize connection to App Store
    await RNIap.initConnection();
    console.log("[IAP] Connection established");

    // Clear any pending transactions (Android - no-op on iOS)
    await RNIap.flushFailedPurchasesCachedAsPendingAndroid();

    isInitialized = true;

    return { success: true };
  } catch (error) {
    console.error("[IAP] Initialization failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup purchase listeners
 * Call this in app root after user is authenticated
 */
export function setupPurchaseListeners(onPurchaseSuccess, onPurchaseError) {
  if (!RNIap) return;

  console.log("[IAP] Setting up purchase listeners");

  // Listen for successful purchases
  purchaseUpdateListener = RNIap.purchaseUpdatedListener(async (purchase) => {
    console.log("[IAP] Purchase update received:", purchase.productId);

    try {
      await handlePurchaseUpdate(purchase);
      onPurchaseSuccess && onPurchaseSuccess(purchase);
    } catch (error) {
      console.error("[IAP] Purchase update error:", error);
      onPurchaseError && onPurchaseError(error);
    }
  });

  // Listen for purchase errors
  purchaseErrorListener = RNIap.purchaseErrorListener((error) => {
    if (error.code === "E_USER_CANCELLED") {
      console.log("[IAP] User cancelled purchase");
    } else {
      console.error("[IAP] Purchase error:", error);
    }
    onPurchaseError && onPurchaseError(error);
  });
}

/**
 * Fetch available subscription products from App Store
 */
export async function getProducts() {
  if (!isInitialized) {
    await initializeIAP();
  }

  if (!RNIap) {
    return { success: false, error: "Module not available" };
  }

  try {
    console.log("[IAP] Fetching products:", SUBSCRIPTION_SKUS);

    const products = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });

    console.log("[IAP] Fetched", products.length, "products");

    // Map to friendly structure
    const productsMap = {
      monthly: products.find((p) => p.productId === PRODUCT_SKUS.MONTHLY),
      yearly: products.find((p) => p.productId === PRODUCT_SKUS.YEARLY),
      all: products,
    };

    return { success: true, products: productsMap };
  } catch (error) {
    console.error("[IAP] Failed to fetch products:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Purchase a subscription
 */
export async function purchaseProduct(productId) {
  if (!isInitialized) {
    await initializeIAP();
  }

  if (!RNIap) {
    return { success: false, error: "Module not available" };
  }

  try {
    console.log("[IAP] Requesting purchase:", productId);

    // Trigger Apple payment sheet
    await RNIap.requestSubscription({ sku: productId });

    // Success is handled by purchaseUpdatedListener
    return { success: true, initiated: true };
  } catch (error) {
    console.error("[IAP] Purchase request failed:", error);

    if (error.code === "E_USER_CANCELLED") {
      return { success: false, cancelled: true };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Restore previous purchases
 * Required by Apple - must be accessible in UI
 */
export async function restorePurchases() {
  if (!isInitialized) {
    await initializeIAP();
  }

  if (!RNIap) {
    return { success: false, error: "Module not available" };
  }

  try {
    console.log("[IAP] Restoring purchases...");

    const availablePurchases = await RNIap.getAvailablePurchases();

    console.log("[IAP] Found", availablePurchases.length, "purchases");

    if (availablePurchases.length === 0) {
      return {
        success: true,
        restored: false,
        message: "No purchases to restore",
      };
    }

    // Get most recent purchase
    const latest = availablePurchases.sort(
      (a, b) => b.transactionDate - a.transactionDate,
    )[0];

    // Get receipt and submit to backend
    const receipt = await getAppStoreReceipt();
    if (receipt) {
      await submitReceiptToBackend(receipt, latest);
    }

    return {
      success: true,
      restored: true,
      productId: latest.productId,
    };
  } catch (error) {
    console.error("[IAP] Restore failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle purchase update from listener
 * Verifies with backend and finishes transaction
 */
async function handlePurchaseUpdate(purchase) {
  console.log("[IAP] Processing purchase:", purchase.transactionId);

  try {
    // Get the App Store receipt
    const receipt = await getAppStoreReceipt();

    if (!receipt) {
      throw new Error("Failed to get receipt");
    }

    // Submit to backend for verification
    const verified = await submitReceiptToBackend(receipt, purchase);

    if (verified.success) {
      console.log("[IAP] Purchase verified successfully");

      // Finish the transaction (required by Apple)
      await RNIap.finishTransaction({ purchase, isConsumable: false });
      console.log("[IAP] Transaction finished");

      return { success: true };
    } else {
      throw new Error("Backend verification failed");
    }
  } catch (error) {
    console.error("[IAP] Failed to process purchase:", error);

    // Still finish transaction to prevent retry loop
    try {
      await RNIap.finishTransaction({ purchase, isConsumable: false });
    } catch (finishError) {
      console.error("[IAP] Failed to finish transaction:", finishError);
    }

    throw error;
  }
}

/**
 * Get App Store receipt (base64)
 */
async function getAppStoreReceipt() {
  if (!RNIap) return null;

  try {
    const receipt = await RNIap.getReceiptIOS();
    return receipt;
  } catch (error) {
    console.error("[IAP] Failed to get receipt:", error);
    return null;
  }
}

/**
 * Submit receipt to backend for verification
 * Backend calls Apple's verifyReceipt API and updates subscription status
 */
async function submitReceiptToBackend(receipt, purchase) {
  const { fetchWithAuth } = require("@/utils/fetchWithAuth");

  try {
    console.log("[IAP] Submitting receipt to backend...");

    const response = await fetchWithAuth("/api/iap/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt,
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        platform: "ios",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Verification failed");
    }

    const data = await response.json();

    console.log("[IAP] Receipt verified:", data.isPremium);

    return data;
  } catch (error) {
    console.error("[IAP] Backend submission failed:", error);
    throw error;
  }
}

/**
 * Get current entitlement from backend
 * This is the source of truth for premium access
 */
export async function getEntitlement() {
  const { fetchWithAuth } = require("@/utils/fetchWithAuth");

  try {
    const response = await fetchWithAuth("/api/iap/entitlement", {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch entitlement");
    }

    const data = await response.json();

    return {
      success: true,
      isPremium: data.isPremium,
      status: data.status,
      productId: data.productId,
      expiresAt: data.expiresAt,
      autoRenewStatus: data.autoRenewStatus,
    };
  } catch (error) {
    console.error("[IAP] Failed to get entitlement:", error);
    return {
      success: false,
      isPremium: false,
      error: error.message,
    };
  }
}

/**
 * Cleanup listeners
 */
export async function teardown() {
  console.log("[IAP] Tearing down listeners...");

  if (purchaseUpdateListener) {
    purchaseUpdateListener.remove();
    purchaseUpdateListener = null;
  }

  if (purchaseErrorListener) {
    purchaseErrorListener.remove();
    purchaseErrorListener = null;
  }

  if (isInitialized && RNIap) {
    try {
      await RNIap.endConnection();
      isInitialized = false;
    } catch (error) {
      console.error("[IAP] Teardown error:", error);
    }
  }
}

// Export flag for checking if module is available
export { isModuleAvailable };
