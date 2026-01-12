import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { PaywallHeader } from "@/components/Paywall/PaywallHeader";
import { PlanCard } from "@/components/Paywall/PlanCard";
import { usePaywallPackages } from "@/hooks/usePaywallPackages";
import { usePaywallHandlers } from "@/hooks/usePaywallHandlers";

const IS_DEV = process.env.NODE_ENV === "development";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    offerings,
    isReady,
    hasAccess,
    purchasePackage,
    restorePurchases,
    fetchCustomerInfo,
    fetchOfferings,
    error,
  } = useRevenueCat();

  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [bypassTaps, setBypassTaps] = useState(0);
  const [showBypass, setShowBypass] = useState(false);

  const { monthlyPackage, yearlyPackage } = usePaywallPackages(offerings);
  const { handlePurchase, handleRestore } = usePaywallHandlers({
    purchasePackage,
    restorePurchases,
    fetchCustomerInfo,
    setPurchasing,
    setRestoring,
  });

  // Auto-redirect if user has active subscription
  useEffect(() => {
    if (isReady && hasAccess) {
      console.log("✅ User has active subscription, redirecting to app");
      router.replace("/(tabs)");
    }
  }, [isReady, hasAccess, router]);

  // Load offerings on mount
  useEffect(() => {
    if (!offerings && isReady) {
      console.log("📡 Loading RevenueCat offerings...");
      fetchOfferings();
    }
  }, [offerings, isReady]);

  // Handle secret bypass tap area (tap app name 7 times)
  const handleSecretTap = () => {
    const newCount = bypassTaps + 1;
    setBypassTaps(newCount);

    if (newCount >= 7) {
      setShowBypass(true);
    }

    // Reset after 3 seconds of no tapping
    setTimeout(() => {
      setBypassTaps(0);
    }, 3000);
  };

  const onPurchase = async () => {
    const pkg = selectedPlan === "monthly" ? monthlyPackage : yearlyPackage;
    const result = await handlePurchase(pkg, selectedPlan);

    // If purchase successful, redirect to app
    if (result?.success) {
      router.replace("/(tabs)");
    }
  };

  const onRestore = async () => {
    const result = await handleRestore();

    // If restore successful and user has access, redirect to app
    if (result?.success && result?.hasAccess) {
      router.replace("/(tabs)");
    }
  };

  // Retry loading offerings
  const handleRetry = async () => {
    await fetchOfferings();
  };

  // Loading state
  if (!isReady) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <StatusBar style="light" />
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 16,
              color: "#FFFFFF",
              fontWeight: "600",
            }}
          >
            Loading subscription options...
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // Error state - Show error message with retry
  if (error && !monthlyPackage && !yearlyPackage) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient
          colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <StatusBar style="light" />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Unable to Load Subscription Options
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.9)",
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={handleRetry}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 32,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#0EA5E9",
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#FFFFFF",
              }}
            >
              Continue to App
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
        style={{ flex: 1 }}
      >
        <StatusBar style="light" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tappable header for secret bypass */}
          <TouchableOpacity
            onPress={handleSecretTap}
            activeOpacity={1}
            style={{ marginBottom: 32 }}
          >
            <PaywallHeader />
          </TouchableOpacity>

          {/* Plans */}
          <View style={{ marginBottom: 32, gap: 16 }}>
            <PlanCard
              plan="yearly"
              packageData={yearlyPackage}
              isSelected={selectedPlan === "yearly"}
              onSelect={() => setSelectedPlan("yearly")}
            />
            <PlanCard
              plan="monthly"
              packageData={monthlyPackage}
              isSelected={selectedPlan === "monthly"}
              onSelect={() => setSelectedPlan("monthly")}
            />
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            onPress={onPurchase}
            disabled={purchasing}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              marginBottom: 16,
              opacity: purchasing ? 0.7 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            {purchasing ? (
              <ActivityIndicator color="#0EA5E9" />
            ) : (
              <Text
                style={{ fontSize: 18, fontWeight: "bold", color: "#0EA5E9" }}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Button */}
          <TouchableOpacity
            onPress={onRestore}
            disabled={restoring}
            style={{
              paddingVertical: 12,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            {restoring ? (
              <ActivityIndicator color="rgba(255, 255, 255, 0.9)" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  color: "rgba(255, 255, 255, 0.9)",
                  fontWeight: "600",
                }}
              >
                Restore Purchases
              </Text>
            )}
          </TouchableOpacity>

          {/* Secret Bypass Button - Only shows after tapping header 7 times */}
          {showBypass && (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 24,
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                🔓 Bypass Paywall
              </Text>
            </TouchableOpacity>
          )}

          {/* Dev Skip Button */}
          {IS_DEV && (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 24,
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Skip (Dev Only)
              </Text>
            </TouchableOpacity>
          )}

          {/* Footer */}
          <Text
            style={{
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Subscriptions auto-renew unless cancelled.{"\n"}
            Manage in Apple ID settings.
          </Text>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
