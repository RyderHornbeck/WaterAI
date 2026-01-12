import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import useUser from "@/utils/auth/useUser";
import { useTodayWater } from "@/hooks/useWaterEntries";

export default function DebugDeleteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();

  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [fetchLogs, setFetchLogs] = useState([]);

  // Get today's date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;

  const { data: waterData, isLoading: loadingWater } =
    useTodayWater(dateString);

  // Environment info
  const baseUrl =
    process.env.EXPO_PUBLIC_PROXY_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL;
  const isHttps = baseUrl?.startsWith("https://");

  // Capture console logs from fetchWithAuth
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const str = args.join(" ");
      if (str.includes("[FETCH WITH AUTH]")) {
        setFetchLogs((prev) => [
          ...prev.slice(-20),
          {
            time: new Date().toLocaleTimeString(),
            message: str,
            type: "log",
          },
        ]);
      }
      originalLog(...args);
    };

    console.error = (...args) => {
      const str = args.join(" ");
      if (str.includes("[FETCH WITH AUTH]")) {
        setFetchLogs((prev) => [
          ...prev.slice(-20),
          {
            time: new Date().toLocaleTimeString(),
            message: str,
            type: "error",
          },
        ]);
      }
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const testDeleteFlow = async () => {
    if (!waterData?.entries || waterData.entries.length === 0) {
      Alert.alert("No Entries", "Add a water entry first to test delete");
      return;
    }

    setTesting(true);
    setTestResults([]);
    const results = [];

    // Pick the first entry to delete
    const entryToDelete = waterData.entries[0];
    const deleteUrl = `/api/water-entry/${entryToDelete.id}`;
    const fullUrl = `${baseUrl}${deleteUrl}`;

    results.push({
      step: "Environment Check",
      status: "info",
      data: {
        "Base URL": baseUrl,
        "Is HTTPS": isHttps ? "✅ Yes" : "❌ No (iOS will block!)",
        "User ID": user?.id,
        "Entry ID": entryToDelete.id,
        "Entry Ounces": entryToDelete.ounces,
        "Full Delete URL": fullUrl,
      },
    });

    try {
      // Step 1: Make the delete request
      results.push({
        step: "Sending DELETE Request",
        status: "loading",
        data: {
          URL: fullUrl,
          Method: "DELETE",
          "Entry ID": entryToDelete.id,
        },
      });

      const startTime = Date.now();
      const response = await fetchWithAuth(deleteUrl, {
        method: "DELETE",
      });
      const duration = Date.now() - startTime;

      results.push({
        step: "Response Received",
        status: response.ok ? "success" : "error",
        data: {
          Status: response.status,
          OK: response.ok ? "✅" : "❌",
          Duration: `${duration}ms`,
          "Content-Type": response.headers.get("content-type"),
        },
      });

      // Step 2: Parse response
      const responseData = await response.json();
      results.push({
        step: "Response Data",
        status: responseData.success ? "success" : "error",
        data: responseData,
      });

      if (!response.ok) {
        results.push({
          step: "Delete Failed",
          status: "error",
          data: {
            Error: responseData.error || "Unknown error",
            "Status Code": response.status,
          },
        });
      } else {
        // Step 3: Verify deletion by fetching again
        results.push({
          step: "Verifying Deletion",
          status: "loading",
          data: { message: "Fetching entry to confirm deletion..." },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        const verifyResponse = await fetchWithAuth(
          `/api/water-entry/${entryToDelete.id}`,
        );
        const verifyData = await verifyResponse.json();

        results.push({
          step: "Verification Result",
          status: verifyResponse.status === 404 ? "success" : "warning",
          data: {
            Status: verifyResponse.status,
            Expected: "404 (not found)",
            Result:
              verifyResponse.status === 404
                ? "✅ Entry deleted"
                : "⚠️ Entry still exists",
            Response: verifyData,
          },
        });
      }
    } catch (error) {
      results.push({
        step: "Request Failed",
        status: "error",
        data: {
          "Error Type": error.name,
          "Error Message": error.message,
          "Network Issue": error.message.includes("Network") ? "✅ Yes" : "No",
          "Timeout Issue": error.message.includes("timeout") ? "✅ Yes" : "No",
        },
      });
    } finally {
      setTestResults(results);
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle size={16} color="#10B981" />;
      case "error":
        return <XCircle size={16} color="#DC2626" />;
      case "warning":
        return <AlertCircle size={16} color="#F59E0B" />;
      default:
        return <AlertCircle size={16} color="#64748B" />;
    }
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
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E0E7FF",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#EFF6FF",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#3B82F6" size={24} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginLeft: 16,
            color: "#1E293B",
          }}
        >
          Delete Debug
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Environment Info */}
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Environment
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{ gap: 12 }}>
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginBottom: 4,
                  }}
                >
                  Base URL
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: "#1E293B",
                  }}
                >
                  {baseUrl || "NOT SET"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, color: "#64748B" }}>
                  HTTPS (ATS)
                </Text>
                <View
                  style={{
                    backgroundColor: isHttps ? "#D1FAE5" : "#FEE2E2",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isHttps ? "#059669" : "#DC2626",
                    }}
                  >
                    {isHttps ? "✅ Enabled" : "❌ Disabled"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 14, color: "#64748B" }}>User ID</Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}
                >
                  {user?.id || "Not logged in"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 14, color: "#64748B" }}>
                  Today's Entries
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}
                >
                  {loadingWater
                    ? "Loading..."
                    : waterData?.entries?.length || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          onPress={testDeleteFlow}
          disabled={testing || loadingWater || !waterData?.entries?.length}
          style={{
            backgroundColor:
              testing || !waterData?.entries?.length ? "#94A3B8" : "#DC2626",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Trash2 color="#fff" size={20} />
            )}
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {testing ? "Testing Delete..." : "Test Delete First Entry"}
            </Text>
          </View>
        </TouchableOpacity>

        {!waterData?.entries?.length && !loadingWater && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#FCD34D",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#92400E",
                textAlign: "center",
              }}
            >
              ⚠️ Add a water entry first to test delete
            </Text>
          </View>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              Test Results
            </Text>

            {testResults.map((result, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  {getStatusIcon(result.status)}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#1E293B",
                      flex: 1,
                    }}
                  >
                    {result.step}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  {Object.entries(result.data).map(([key, value]) => (
                    <View key={key} style={{ marginBottom: 8 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          marginBottom: 2,
                          fontWeight: "600",
                        }}
                      >
                        {key}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "#1E293B",
                        }}
                      >
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Fetch Logs */}
        {fetchLogs.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: "#64748B",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Network Logs
              </Text>
              <TouchableOpacity onPress={() => setFetchLogs([])}>
                <Text
                  style={{ fontSize: 14, color: "#3B82F6", fontWeight: "600" }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: "#1E293B",
                borderRadius: 16,
                padding: 16,
              }}
            >
              {fetchLogs.map((log, index) => (
                <View
                  key={index}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: index < fetchLogs.length - 1 ? 1 : 0,
                    borderBottomColor: "#334155",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#94A3B8",
                      marginBottom: 4,
                    }}
                  >
                    {log.time}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: log.type === "error" ? "#F87171" : "#E0E7FF",
                    }}
                  >
                    {log.message}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instructions */}
        <View
          style={{
            backgroundColor: "#DBEAFE",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "#93C5FD",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E40AF",
              marginBottom: 8,
            }}
          >
            📋 What This Tests
          </Text>
          <Text style={{ fontSize: 13, color: "#1E40AF", marginBottom: 4 }}>
            • Confirms HTTPS (required for iOS)
          </Text>
          <Text style={{ fontSize: 13, color: "#1E40AF", marginBottom: 4 }}>
            • Shows exact URL being called
          </Text>
          <Text style={{ fontSize: 13, color: "#1E40AF", marginBottom: 4 }}>
            • Tests DELETE request with auth
          </Text>
          <Text style={{ fontSize: 13, color: "#1E40AF", marginBottom: 4 }}>
            • Verifies entry is actually deleted
          </Text>
          <Text style={{ fontSize: 13, color: "#1E40AF" }}>
            • Captures all network logs
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
