import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react-native";
import Constants from "expo-constants";
import { useRevenueCat } from "@/hooks/useRevenueCat";

export default function DebugRevenueCatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Get live RevenueCat data
  const {
    customerInfo,
    offerings,
    isReady,
    hasAccess,
    error,
    isInitialized,
    fetchCustomerInfo,
    fetchOfferings,
  } = useRevenueCat();

  // Get the raw environment variable
  const rawApiKey = process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY;
  const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : rawApiKey;

  // Check validation
  const isValidFormat =
    typeof apiKey === "string" &&
    apiKey.length > 5 &&
    (apiKey.startsWith("appl_") || apiKey.startsWith("goog_"));

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomerInfo();
    await fetchOfferings();
    setRefreshing(false);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0F172A",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginLeft: 16,
            color: "#FFFFFF",
            flex: 1,
          }}
        >
          RevenueCat Debug
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {refreshing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <RefreshCw color="#FFFFFF" size={20} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Status Card */}
        <View
          style={{
            backgroundColor:
              isReady && hasAccess
                ? "rgba(34, 197, 94, 0.1)"
                : isReady
                  ? "rgba(251, 191, 36, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            borderColor:
              isReady && hasAccess
                ? "rgba(34, 197, 94, 0.3)"
                : isReady
                  ? "rgba(251, 191, 36, 0.3)"
                  : "rgba(239, 68, 68, 0.3)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          {isReady && hasAccess ? (
            <CheckCircle size={48} color="#22C55E" />
          ) : (
            <AlertCircle size={48} color={isReady ? "#FBBF24" : "#EF4444"} />
          )}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color:
                isReady && hasAccess
                  ? "#22C55E"
                  : isReady
                    ? "#FBBF24"
                    : "#EF4444",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {isReady && hasAccess
              ? "Active Subscription ✓"
              : isReady
                ? "No Subscription"
                : "Not Ready"}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#94A3B8",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {isReady
              ? hasAccess
                ? "User has premium access"
                : "Free tier user"
              : "RevenueCat still initializing..."}
          </Text>
        </View>

        {/* RevenueCat Status */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 12,
            }}
          >
            RevenueCat Status
          </Text>

          <CheckCard label="Is Initialized" passed={isInitialized} />
          <CheckCard label="Is Ready" passed={isReady} />
          <CheckCard label="Has Access" passed={hasAccess} />
          <CheckCard label="Customer Info Loaded" passed={!!customerInfo} />
          <CheckCard label="Offerings Loaded" passed={!!offerings} />
        </View>

        {/* Environment Info */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 12,
            }}
          >
            Environment Info
          </Text>

          <InfoCard
            label="Platform"
            value={Platform.OS}
            isGood={Platform.OS === "ios" || Platform.OS === "android"}
          />
          <InfoCard
            label="Execution Environment"
            value={Constants.executionEnvironment || "unknown"}
            isGood={
              Constants.executionEnvironment === "bare" ||
              Constants.executionEnvironment === "standalone"
            }
          />
          <InfoCard
            label="NODE_ENV"
            value={process.env.NODE_ENV || "unknown"}
          />

          <View
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: "#93C5FD",
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              ℹ️ Expected for Expo Dev Client:
            </Text>
            <Text style={{ fontSize: 11, color: "#93C5FD", marginBottom: 3 }}>
              • executionEnvironment should be "bare" ✅
            </Text>
            <Text style={{ fontSize: 11, color: "#93C5FD" }}>
              • RevenueCat should initialize successfully ✅
            </Text>
          </View>
        </View>

        {/* API Key Details */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 12,
            }}
          >
            API Key Details
          </Text>

          <InfoCard
            label="Key Exists"
            value={rawApiKey ? "Yes" : "No"}
            isGood={!!rawApiKey}
          />
          <InfoCard
            label="Key Length"
            value={apiKey?.length || 0}
            isGood={(apiKey?.length || 0) > 20}
          />
          <InfoCard
            label="Key Prefix"
            value={apiKey ? apiKey.substring(0, 10) + "..." : "none"}
            isGood={apiKey?.startsWith("appl_") || apiKey?.startsWith("goog_")}
          />
          <InfoCard
            label="Valid Format"
            value={isValidFormat ? "Yes" : "No"}
            isGood={isValidFormat}
          />
        </View>

        {/* Customer Info */}
        {customerInfo && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginBottom: 12,
              }}
            >
              Customer Info
            </Text>

            <InfoCard
              label="Original App User ID"
              value={customerInfo.originalAppUserId || "N/A"}
            />
            <InfoCard
              label="Active Entitlements"
              value={
                Object.keys(customerInfo.entitlements?.active || {}).join(
                  ", ",
                ) || "None"
              }
              isGood={
                Object.keys(customerInfo.entitlements?.active || {}).length > 0
              }
            />
            <InfoCard
              label="Request Date"
              value={
                customerInfo.requestDate
                  ? new Date(customerInfo.requestDate).toLocaleString()
                  : "N/A"
              }
            />
          </View>
        )}

        {/* Offerings */}
        {offerings?.current && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginBottom: 12,
              }}
            >
              Current Offering
            </Text>

            <InfoCard
              label="Offering Identifier"
              value={offerings.current.identifier}
            />
            <InfoCard
              label="Server Description"
              value={offerings.current.serverDescription || "N/A"}
            />
            <InfoCard
              label="Available Packages"
              value={offerings.current.availablePackages?.length || 0}
              isGood={(offerings.current.availablePackages?.length || 0) > 0}
            />

            {offerings.current.availablePackages?.map((pkg, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: "#60A5FA",
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Package {index + 1}: {pkg.identifier}
                </Text>
                <Text
                  style={{ fontSize: 13, color: "#93C5FD", marginBottom: 4 }}
                >
                  Type: {pkg.packageType}
                </Text>
                <Text
                  style={{ fontSize: 13, color: "#93C5FD", marginBottom: 4 }}
                >
                  Price: {pkg.product.priceString}
                </Text>
                <Text style={{ fontSize: 13, color: "#93C5FD" }}>
                  Product ID: {pkg.product.identifier}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Error Info */}
        {error && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#FFFFFF",
                marginBottom: 12,
              }}
            >
              Error Message
            </Text>

            <View
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text
                style={{
                  color: "#FCA5A5",
                  fontSize: 14,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                {error}
              </Text>
            </View>
          </View>
        )}

        {/* Instructions */}
        <View
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(59, 130, 246, 0.3)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#60A5FA",
              marginBottom: 12,
            }}
          >
            What to Check:
          </Text>
          <Text style={{ fontSize: 14, color: "#93C5FD", marginBottom: 8 }}>
            • All status checks should be green for full functionality
          </Text>
          <Text style={{ fontSize: 14, color: "#93C5FD", marginBottom: 8 }}>
            • Execution environment should be "bare" (Expo Dev Client)
          </Text>
          <Text style={{ fontSize: 14, color: "#93C5FD", marginBottom: 8 }}>
            • If offerings are loaded, packages should appear below
          </Text>
          <Text style={{ fontSize: 14, color: "#93C5FD" }}>
            • Screenshot this screen and share for troubleshooting
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoCard({ label, value, isGood, mono }) {
  const displayValue = String(value);
  const color =
    isGood === undefined ? "#94A3B8" : isGood ? "#22C55E" : "#EF4444";

  return (
    <View
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color,
          fontWeight: "600",
          fontFamily: mono
            ? Platform.OS === "ios"
              ? "Courier"
              : "monospace"
            : undefined,
        }}
      >
        {displayValue}
      </Text>
    </View>
  );
}

function CheckCard({ label, passed }) {
  return (
    <View
      style={{
        backgroundColor: passed
          ? "rgba(34, 197, 94, 0.1)"
          : "rgba(239, 68, 68, 0.1)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: passed ? "#22C55E" : "#EF4444",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 18 }}>{passed ? "✓" : "✗"}</Text>
    </View>
  );
}
