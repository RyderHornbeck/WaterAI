import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

export default function DebugEnv() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [testResults, setTestResults] = useState(null);

  // Get all EXPO_PUBLIC_ environment variables
  const envVars = Object.keys(process.env)
    .filter((key) => key.startsWith("EXPO_PUBLIC_"))
    .sort()
    .reduce((acc, key) => {
      acc[key] = process.env[key];
      return acc;
    }, {});

  // RevenueCat API Key check
  const rcApiKey = process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY;
  const rcApiKeyValid =
    rcApiKey && typeof rcApiKey === "string" && rcApiKey.startsWith("appl_");

  const testEndpoints = async () => {
    setTestResults({ testing: true });
    const results = [];

    const baseUrl =
      process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
      process.env.EXPO_PUBLIC_BASE_URL;

    // Test different URL combinations
    const urlsToTest = [
      {
        name: "PROXY_BASE_URL + /api/mobile-auth/signin",
        url: `${process.env.EXPO_PUBLIC_PROXY_BASE_URL}/api/mobile-auth/signin`,
      },
      {
        name: "BASE_URL + /api/mobile-auth/signin",
        url: `${process.env.EXPO_PUBLIC_BASE_URL}/api/mobile-auth/signin`,
      },
      {
        name: "Computed baseUrl + /api/mobile-auth/signin",
        url: `${baseUrl}/api/mobile-auth/signin`,
      },
    ];

    for (const test of urlsToTest) {
      if (!test.url.startsWith("http")) {
        results.push({
          ...test,
          status: "SKIP",
          message: "Invalid URL (missing http)",
        });
        continue;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(test.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: "test@test.com", password: "test" }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();
        const isHTML =
          text.trim().startsWith("<!DOCTYPE") ||
          text.trim().startsWith("<html");
        const isJSON = contentType.includes("application/json");

        results.push({
          ...test,
          status: response.status,
          ok: response.ok,
          contentType,
          isJSON,
          isHTML,
          preview: text.substring(0, 100),
        });
      } catch (error) {
        results.push({
          ...test,
          status: "ERROR",
          message: error.message,
        });
      }
    }

    setTestResults(results);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F0F9FF",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="dark" />

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
            backgroundColor: "#fff",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginLeft: 16 }}>
          Environment Debug
        </Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* RevenueCat API Key Check */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
            RevenueCat API Key Status
          </Text>

          <View
            style={{
              backgroundColor: rcApiKeyValid ? "#D1FAE5" : "#FEE2E2",
              padding: 16,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: rcApiKeyValid ? "#059669" : "#DC2626",
                }}
              >
                {rcApiKeyValid
                  ? "✅ API Key Valid"
                  : "❌ API Key Missing or Invalid"}
              </Text>
            </View>

            <View style={{ marginTop: 8, gap: 6 }}>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                <Text style={{ fontWeight: "600" }}>Exists: </Text>
                {rcApiKey ? "Yes" : "No"}
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                <Text style={{ fontWeight: "600" }}>Type: </Text>
                {typeof rcApiKey}
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                <Text style={{ fontWeight: "600" }}>Length: </Text>
                {rcApiKey?.length || 0}
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                <Text style={{ fontWeight: "600" }}>Starts with "appl_": </Text>
                {rcApiKey?.startsWith("appl_") ? "Yes ✓" : "No ✗"}
              </Text>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                <Text style={{ fontWeight: "600" }}>Preview: </Text>
                <Text style={{ fontFamily: "monospace" }}>
                  {rcApiKey ? rcApiKey.substring(0, 20) + "..." : "undefined"}
                </Text>
              </Text>
            </View>

            {!rcApiKeyValid && (
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#FCA5A5",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: "#DC2626",
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  ⚠️ This will cause RevenueCat to fail
                </Text>
                <Text style={{ fontSize: 12, color: "#991B1B" }}>
                  The build needs EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY set in
                  EAS build configuration.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Environment Variables Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
            Environment Variables
          </Text>

          {Object.keys(envVars).length === 0 ? (
            <View
              style={{
                backgroundColor: "#FEE2E2",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#DC2626" }}>
                ⚠️ No EXPO_PUBLIC_* environment variables found!
              </Text>
            </View>
          ) : (
            Object.entries(envVars).map(([key, value]) => (
              <View
                key={key}
                style={{
                  backgroundColor: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontWeight: "600", fontSize: 12, color: "#64748B" }}
                >
                  {key}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    marginTop: 4,
                    fontFamily: "monospace",
                  }}
                >
                  {value || "(empty)"}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Computed Values */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
            Computed Values
          </Text>

          <View
            style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8 }}
          >
            <Text style={{ fontWeight: "600", fontSize: 12, color: "#64748B" }}>
              Base URL (with fallback)
            </Text>
            <Text
              style={{ fontSize: 14, marginTop: 4, fontFamily: "monospace" }}
            >
              {process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
                process.env.EXPO_PUBLIC_BASE_URL ||
                "(none)"}
            </Text>
          </View>
        </View>

        {/* Test Endpoints Button */}
        <TouchableOpacity
          onPress={testEndpoints}
          disabled={testResults?.testing}
          style={{
            backgroundColor: "#3B82F6",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {testResults?.testing ? "Testing..." : "Test API Endpoints"}
          </Text>
        </TouchableOpacity>

        {/* Test Results */}
        {testResults && !testResults.testing && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}
            >
              Test Results
            </Text>

            {testResults.map((result, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: result.isJSON
                    ? "#10B981"
                    : result.isHTML
                      ? "#EF4444"
                      : "#F59E0B",
                }}
              >
                <Text style={{ fontWeight: "600", marginBottom: 8 }}>
                  {result.name}
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}
                >
                  {result.url}
                </Text>

                {result.status === "ERROR" || result.status === "SKIP" ? (
                  <Text
                    style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}
                  >
                    {result.message}
                  </Text>
                ) : (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: result.ok ? "#D1FAE5" : "#FEE2E2",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "600" }}>
                          Status: {result.status}
                        </Text>
                      </View>

                      {result.isJSON && (
                        <View
                          style={{
                            backgroundColor: "#D1FAE5",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: "#059669",
                            }}
                          >
                            ✓ JSON
                          </Text>
                        </View>
                      )}

                      {result.isHTML && (
                        <View
                          style={{
                            backgroundColor: "#FEE2E2",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: "#DC2626",
                            }}
                          >
                            ✗ HTML (Wrong!)
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 10,
                        color: "#64748B",
                        marginTop: 8,
                        fontFamily: "monospace",
                      }}
                    >
                      {result.preview}...
                    </Text>
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View
          style={{
            backgroundColor: "#DBEAFE",
            padding: 12,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <Text
            style={{ fontWeight: "600", color: "#1E40AF", marginBottom: 8 }}
          >
            What to look for:
          </Text>
          <Text style={{ fontSize: 12, color: "#1E40AF", marginBottom: 4 }}>
            • EXPO_PUBLIC_PROXY_BASE_URL should point to your API server
          </Text>
          <Text style={{ fontSize: 12, color: "#1E40AF", marginBottom: 4 }}>
            • Test results should show "✓ JSON" (green), not "✗ HTML" (red)
          </Text>
          <Text style={{ fontSize: 12, color: "#1E40AF" }}>
            • If you see HTML, the URL is pointing to your web frontend instead
            of your API
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
