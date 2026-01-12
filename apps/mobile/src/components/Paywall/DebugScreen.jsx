import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

// Check if RevenueCat native module is present
let Purchases = null;
let isNativeModulePresent = false;

try {
  Purchases = require("react-native-purchases").default;
  isNativeModulePresent = !!Purchases;
  console.log("RevenueCat native module present:", isNativeModulePresent);
} catch (error) {
  console.log("RevenueCat native module present:", false);
  console.log("Import error:", error.message);
}

export function DebugScreen({
  detailedError,
  isModuleAvailable,
  isInitialized,
  isExpoGo,
  error,
  retryCount,
  onRetry,
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  return (
    <LinearGradient
      colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />

      {/* Back Button */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 40,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View
            style={{
              width: 100,
              height: 100,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: 50,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <AlertCircle size={50} color="#FFFFFF" />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            RevenueCat Debug Info
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.95)",
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 24,
            }}
          >
            Here's what's happening with in-app purchases
          </Text>
        </View>

        {/* Status Summary */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#FFFFFF",
              marginBottom: 12,
            }}
          >
            Status Summary
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.95)",
              lineHeight: 22,
              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
            }}
          >
            Platform: {Platform.OS}
            {"\n"}
            Native Module Present: {isNativeModulePresent ? "✅ Yes" : "❌ No"}
            {"\n"}
            Module Available: {isModuleAvailable ? "✅ Yes" : "❌ No"}
            {"\n"}
            Initialized: {isInitialized ? "✅ Yes" : "❌ No"}
            {"\n"}
            Expo Go: {isExpoGo ? "Yes" : "No"}
            {"\n"}
            Has Error: {error ? "❌ Yes" : "✅ No"}
          </Text>
        </View>

        {/* Native Module Warning */}
        {!isNativeModulePresent && (
          <View
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.3)",
              borderWidth: 2,
              borderColor: "rgba(239, 68, 68, 0.5)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              ⚠️ Native Module Missing
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.95)",
                lineHeight: 20,
                marginBottom: 12,
              }}
            >
              The RevenueCat native module is not present in this build. This
              means the Expo config plugin is likely missing.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/revenuecat-setup-guide")}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#EF4444",
                }}
              >
                View Setup Guide →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detailed Error Panel (Collapsible) */}
        {detailedError && (
          <View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: 16,
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              onPress={() => setShowDebugPanel(!showDebugPanel)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                🔍 Detailed Error Info
              </Text>
              {showDebugPanel ? (
                <ChevronUp size={24} color="#FFFFFF" />
              ) : (
                <ChevronDown size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {showDebugPanel && (
              <View style={{ padding: 20, paddingTop: 0 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#FFFFFF",
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Failed At Step:
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: 16,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  {detailedError.step}
                </Text>

                <Text
                  style={{
                    fontSize: 13,
                    color: "#FFFFFF",
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Error Message:
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: 16,
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  {detailedError.error?.message || "Unknown error"}
                </Text>

                {detailedError.error?.code && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginBottom: 8,
                      }}
                    >
                      Error Code:
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "rgba(255, 255, 255, 0.9)",
                        marginBottom: 16,
                        fontFamily:
                          Platform.OS === "ios" ? "Courier" : "monospace",
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      {detailedError.error.code}
                    </Text>
                  </>
                )}

                {detailedError.error?.stack && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginBottom: 8,
                      }}
                    >
                      Stack Trace:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 16 }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: "rgba(255, 255, 255, 0.9)",
                          fontFamily:
                            Platform.OS === "ios" ? "Courier" : "monospace",
                          backgroundColor: "rgba(0, 0, 0, 0.3)",
                          padding: 12,
                          borderRadius: 8,
                        }}
                      >
                        {detailedError.error.stack}
                      </Text>
                    </ScrollView>
                  </>
                )}

                <Text
                  style={{
                    fontSize: 13,
                    color: "#FFFFFF",
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Full Error Object:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(255, 255, 255, 0.9)",
                      fontFamily:
                        Platform.OS === "ios" ? "Courier" : "monospace",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    {JSON.stringify(detailedError, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <RefreshCw size={20} color="#0EA5E9" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#0EA5E9",
            }}
          >
            Retry {retryCount > 0 ? `(${retryCount})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 16,
            paddingVertical: 14,
            paddingHorizontal: 24,
            marginBottom: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#FFFFFF",
            }}
          >
            Continue to App
          </Text>
        </TouchableOpacity>

        {/* Helper Text */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.95)",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            💡 The app will continue to work normally. This debug screen helps
            identify subscription issues.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
