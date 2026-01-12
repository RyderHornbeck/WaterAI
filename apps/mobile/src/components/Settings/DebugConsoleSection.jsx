import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  Bell,
} from "lucide-react-native";
import { getRefetchLogs, clearRefetchLogs } from "@/hooks/useWaterEntries";
import {
  debugNotificationStatus,
  sendTestNotification,
} from "@/utils/notificationDebug";

export function DebugConsoleSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    const fetchedLogs = await getRefetchLogs();
    setLogs(fetchedLogs);
  };

  useEffect(() => {
    if (isExpanded) {
      loadLogs();
    }
  }, [isExpanded]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const handleClearLogs = async () => {
    await clearRefetchLogs();
    setLogs([]);
  };

  const handleTestNotification = async () => {
    const id = await sendTestNotification();
    if (id) {
      Alert.alert(
        "Test Notification Scheduled! ⏰",
        "You should receive a notification in 5 seconds. Make sure your app is in the background or closed to see it.",
        [{ text: "OK" }],
      );
    } else {
      Alert.alert(
        "Error",
        "Failed to schedule test notification. Check console logs for details.",
      );
    }
  };

  const handleCheckNotificationStatus = async () => {
    const status = await debugNotificationStatus();
    if (status) {
      Alert.alert(
        "Notification Status",
        `Permission: ${status.permissionStatus}\nScheduled: ${status.scheduledCount} notifications\n\nCheck console for detailed info.`,
        [{ text: "OK" }],
      );
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getActionColor = (action) => {
    switch (action) {
      case "ADD":
        return "#10B981"; // green
      case "DELETE":
        return "#EF4444"; // red
      case "FETCH":
        return "#3B82F6"; // blue
      default:
        return "#6B7280"; // gray
    }
  };

  const getActionBg = (action) => {
    switch (action) {
      case "ADD":
        return "#D1FAE5"; // light green
      case "DELETE":
        return "#FEE2E2"; // light red
      case "FETCH":
        return "#DBEAFE"; // light blue
      default:
        return "#F3F4F6"; // light gray
    }
  };

  return (
    <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
      {/* Header */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#F9FAFB",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#EEF2FF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 2,
              }}
            >
              Debug Console
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>
              View refetch logs {logs.length > 0 && `(${logs.length})`}
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#6B7280" />
        ) : (
          <ChevronDown size={20} color="#6B7280" />
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            overflow: "hidden",
          }}
        >
          {/* Notification Testing Section */}
          <View
            style={{
              padding: 12,
              backgroundColor: "#F0F9FF",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              🔔 Notification Testing
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleCheckNotificationStatus}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#DBEAFE",
                  borderRadius: 8,
                }}
              >
                <Bell size={16} color="#1D4ED8" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#1D4ED8",
                  }}
                >
                  Check Status
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTestNotification}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#D1FAE5",
                  borderRadius: 8,
                }}
              >
                <Bell size={16} color="#047857" />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#047857",
                  }}
                >
                  Test (5s)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions Bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              backgroundColor: "#F9FAFB",
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Refetch History
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={handleRefresh}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: "#EEF2FF",
                  borderRadius: 8,
                }}
              >
                <RefreshCw size={14} color="#4F46E5" />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: "#4F46E5" }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClearLogs}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: "#FEE2E2",
                  borderRadius: 8,
                }}
              >
                <Trash2 size={14} color="#DC2626" />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Logs List */}
          <ScrollView
            style={{ maxHeight: 400 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            {logs.length === 0 ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>📊</Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#9CA3AF",
                    textAlign: "center",
                  }}
                >
                  No refetch events yet.{"\n"}
                  Add or delete entries to see logs.
                </Text>
              </View>
            ) : (
              logs.map((log, index) => (
                <View
                  key={log.id}
                  style={{
                    padding: 12,
                    borderBottomWidth: index < logs.length - 1 ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    {/* Action Badge */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: getActionBg(log.action),
                        borderRadius: 6,
                        minWidth: 60,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: getActionColor(log.action),
                          letterSpacing: 0.5,
                        }}
                      >
                        {log.action}
                      </Text>
                    </View>

                    {/* Log Details */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: 2,
                        }}
                      >
                        {log.page}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                          {formatDate(log.timestamp)}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                          •
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#4B5563",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatTime(log.timestamp)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Info */}
          {logs.length > 0 && (
            <View
              style={{
                padding: 12,
                backgroundColor: "#F9FAFB",
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
              }}
            >
              <Text
                style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}
              >
                Showing {logs.length} event{logs.length !== 1 ? "s" : ""} • Last
                100 events kept
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Info Box */}
      {isExpanded && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            backgroundColor: "#EFF6FF",
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: "#3B82F6",
          }}
        >
          <Text style={{ fontSize: 12, color: "#1E40AF", lineHeight: 18 }}>
            <Text style={{ fontWeight: "700" }}>
              Selective Refetch System:{" "}
            </Text>
            ADD actions only refetch Track page. DELETE from Entry page
            refetches Entry + Track. DELETE from History page refetches Entry +
            Track + History. Entry page always fetches fresh (no cache).
          </Text>
        </View>
      )}
    </View>
  );
}
