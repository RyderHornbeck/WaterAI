import { Alert } from "react-native";
import { useRouter } from "expo-router";

export function usePaywallHandlers({
  purchasePackage,
  restorePurchases,
  fetchCustomerInfo,
  setPurchasing,
  setRestoring,
}) {
  const router = useRouter();

  const handlePurchase = async (pkg, selectedPlan) => {
    if (!pkg) {
      console.error("❌ Package not found:", selectedPlan);
      Alert.alert("Error", "Subscription not available. Please try again.");
      return { success: false, error: "Package not found" };
    }

    console.log("🛒 Attempting purchase:", pkg.identifier);
    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);

    if (result.success) {
      const info = await fetchCustomerInfo();
      const hasAccess = info?.entitlements?.active?.access;
      return { success: true, hasAccess, customerInfo: info };
    } else if (result.cancelled) {
      // User cancelled, do nothing
      return { success: false, cancelled: true };
    } else {
      Alert.alert(
        "Purchase Failed",
        result.error || "Something went wrong. Please try again.",
      );
      return { success: false, error: result.error };
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      const hasAccess = result.customerInfo?.entitlements?.active?.access;
      if (hasAccess) {
        Alert.alert("Success", "Your subscription has been restored!");
        return {
          success: true,
          hasAccess: true,
          customerInfo: result.customerInfo,
        };
      } else {
        Alert.alert(
          "No Subscription Found",
          "We could not find an active subscription for this account.",
        );
        return { success: false, hasAccess: false };
      }
    } else {
      Alert.alert(
        "Restore Failed",
        result.error || "Could not restore purchases. Please try again.",
      );
      return { success: false, error: result.error };
    }
  };

  return { handlePurchase, handleRestore };
}
