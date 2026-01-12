import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Server,
  AlertCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import useUser from "@/utils/auth/useUser";
import { debugLogger } from "./debugLogger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function DebugScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { hasNetwork } = useNetworkStatus();

  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [authState, setAuthState] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'add', 'delete', 'error'

  const loadData = async () => {
    try {
      // Load logs
      const allLogs = await debugLogger.getLogs();
      setLogs(allLogs);

      // Load diagnostics
      const diag = await debugLogger.getDiagnostics();
      setDiagnostics(diag);

      // Load auth state
      const token = await AsyncStorage.getItem("authToken");
      setAuthState({
        userId: user?.id || null,
        email: user?.email || null,
        tokenPresent: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      });
    } catch (error) {
      console.error("Failed to load debug data:", error);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to log updates
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClearLogs = async () => {
    await debugLogger.clearLogs();
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    if (filter === "add") return log.type === "add";
    if (filter === "delete") return log.type === "delete";
    if (filter === "error")
      return log.status === "error" || log.error || log.statusCode >= 400;
    return true;
  });

  const getStatusColor = (log) => {
    if (
      log.status === "success" ||
      (log.statusCode >= 200 && log.statusCode < 300)
    )
      return "#10B981";
    if (log.status === "error" || log.statusCode >= 400) return "#DC2626";
    if (log.status === "pending" || log.status === "loading") return "#F59E0B";
    return "#64748B";
  };

  const getStatusIcon = (log) => {
    const color = getStatusColor(log);
    if (
      log.status === "success" ||
      (log.statusCode >= 200 && log.statusCode < 300)
    )
      return <CheckCircle size={16} color={color} />;
    if (log.status === "error" || log.statusCode >= 400)
      return <XCircle size={16} color={color} />;
    if (log.status === "pending" || log.status === "loading")
      return <Clock size={16} color={color} />;
    return <AlertCircle size={16} color={color} />;
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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
          Debug Console
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
                  style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}
                >
                  API Base URL
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "monospace",
                    color: "#1E293B",
                  }}
                >
                  {diagnostics?.baseUrl || "Loading..."}
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
                  Environment
                </Text>
                <View
                  style={{
                    backgroundColor:
                      diagnostics?.environment === "prod"
                        ? "#DBEAFE"
                        : diagnostics?.environment === "staging"
                          ? "#FEF3C7"
                          : "#D1FAE5",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        diagnostics?.environment === "prod"
                          ? "#1E40AF"
                          : diagnostics?.environment === "staging"
                            ? "#92400E"
                            : "#059669",
                    }}
                  >
                    {diagnostics?.environment?.toUpperCase() || "UNKNOWN"}
                  </Text>
                </View>
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
                    backgroundColor: diagnostics?.isHttps
                      ? "#D1FAE5"
                      : "#FEE2E2",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: diagnostics?.isHttps ? "#059669" : "#DC2626",
                    }}
                  >
                    {diagnostics?.isHttps ? "✅ Enabled" : "❌ Disabled"}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, color: "#64748B" }}>Network</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  {hasNetwork ? (
                    <Wifi size={16} color="#10B981" />
                  ) : (
                    <WifiOff size={16} color="#DC2626" />
                  )}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: hasNetwork ? "#10B981" : "#DC2626",
                    }}
                  >
                    {hasNetwork ? "Connected" : "Offline"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Auth State */}
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
            Auth State
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
                  {authState?.userId || "Not authenticated"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 14, color: "#64748B" }}>Email</Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#1E293B" }}
                >
                  {authState?.email || "N/A"}
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
                  JWT Token
                </Text>
                <View
                  style={{
                    backgroundColor: authState?.tokenPresent
                      ? "#D1FAE5"
                      : "#FEE2E2",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: authState?.tokenPresent ? "#059669" : "#DC2626",
                    }}
                  >
                    {authState?.tokenPresent ? "Present" : "Missing"}
                  </Text>
                </View>
              </View>

              {authState?.tokenPresent && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginBottom: 4,
                    }}
                  >
                    Token Preview
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "#1E293B",
                    }}
                  >
                    {authState.tokenPreview}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ marginBottom: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["all", "add", "delete", "error"].map((filterType) => (
                <TouchableOpacity
                  key={filterType}
                  onPress={() => setFilter(filterType)}
                  style={{
                    backgroundColor:
                      filter === filterType ? "#3B82F6" : "#F1F5F9",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: filter === filterType ? "#FFFFFF" : "#64748B",
                    }}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
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
              Operation Logs ({filteredLogs.length})
            </Text>
            <TouchableOpacity
              onPress={handleClearLogs}
              style={{
                backgroundColor: "#FEE2E2",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#DC2626" }}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logs */}
        {filteredLogs.length === 0 ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Server size={48} color="#CBD5E1" />
            <Text
              style={{
                fontSize: 16,
                color: "#94A3B8",
                marginTop: 12,
                fontStyle: "italic",
              }}
            >
              No operations logged yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#CBD5E1",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Add or delete water entries to see them here
            </Text>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <View
              key={log.id}
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
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {getStatusIcon(log)}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: "#1E293B",
                    }}
                  >
                    {log.type === "add" ? "Add Water" : "Delete Entry"}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                  {formatTime(log.timestamp)}
                </Text>
              </View>

              {/* Details */}
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                {/* Request Info */}
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#64748B",
                      marginBottom: 2,
                      fontWeight: "600",
                    }}
                  >
                    Request
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "#1E293B",
                    }}
                  >
                    {log.method} {log.url}
                  </Text>
                </View>

                {/* Payload */}
                {log.payload && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Payload
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#1E293B",
                      }}
                    >
                      {JSON.stringify(log.payload, null, 2)}
                    </Text>
                  </View>
                )}

                {/* Entry ID (for deletes) */}
                {log.entryId && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Entry ID
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "#1E293B",
                      }}
                    >
                      {log.entryId}
                    </Text>
                  </View>
                )}

                {/* Status */}
                {log.statusCode && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Status
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: getStatusColor(log),
                        fontWeight: "600",
                      }}
                    >
                      {log.statusCode} {log.statusText || ""}
                    </Text>
                  </View>
                )}

                {/* Response */}
                {log.response && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Response
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#1E293B",
                      }}
                    >
                      {JSON.stringify(log.response, null, 2)}
                    </Text>
                  </View>
                )}

                {/* Error */}
                {log.error && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#DC2626",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Error
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#DC2626",
                      }}
                    >
                      {log.error}
                    </Text>
                  </View>
                )}

                {/* Duration */}
                {log.duration && (
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginBottom: 2,
                        fontWeight: "600",
                      }}
                    >
                      Duration
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "#1E293B",
                      }}
                    >
                      {log.duration}ms
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
