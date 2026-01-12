import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react-native";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function DataManagementSection({ cleanupLoading, onCleanup }) {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetchWithAuth("/api/cleanup-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch cleanup stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCleanup = () => {
    // Pass fetchStats as a callback to refresh stats after cleanup
    onCleanup(fetchStats);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: "#64748B",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Data Management
      </Text>
      <View
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#BFDBFE",
          borderRadius: 20,
          padding: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: "#DBEAFE",
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#93C5FD",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Database color="#0EA5E9" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              Clean Up Old Data
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#64748B",
                lineHeight: 18,
              }}
            >
              Hard delete entries older than 40 days
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCleanup}
          disabled={cleanupLoading}
          style={{
            backgroundColor: cleanupLoading ? "#E0E7FF" : "#EEF2FF",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#C7D2FE",
            marginBottom: 12,
          }}
        >
          {cleanupLoading ? (
            <ActivityIndicator size="small" color="#4F46E5" />
          ) : (
            <Text
              style={{
                color: "#4F46E5",
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              Run Cleanup
            </Text>
          )}
        </TouchableOpacity>

        {/* Debug Panel Toggle */}
        <TouchableOpacity
          onPress={() => setShowDebug(!showDebug)}
          style={{
            backgroundColor: "#F1F5F9",
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: showDebug ? 12 : 0,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#475569",
            }}
          >
            {showDebug ? "Hide" : "Show"} Debug Stats
          </Text>
          {showDebug ? (
            <ChevronUp size={18} color="#475569" />
          ) : (
            <ChevronDown size={18} color="#475569" />
          )}
        </TouchableOpacity>

        {/* Debug Panel Content */}
        {showDebug && (
          <View
            style={{
              backgroundColor: "#F8FAFC",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            {/* Refresh Button */}
            <TouchableOpacity
              onPress={fetchStats}
              disabled={statsLoading}
              style={{
                backgroundColor: "#FFFFFF",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#CBD5E1",
                marginBottom: 16,
              }}
            >
              {statsLoading ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <>
                  <RefreshCw size={16} color="#3B82F6" />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#3B82F6",
                      marginLeft: 6,
                    }}
                  >
                    Refresh Stats
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {stats && (
              <ScrollView>
                {/* Entries Section */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#64748B",
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Entries
                  </Text>
                  <StatRow label="Active Entries" value={stats.totalEntries} />
                  <StatRow
                    label="Soft Deleted"
                    value={stats.softDeletedEntries}
                    alert={stats.softDeletedEntries > 0}
                  />
                  <StatRow
                    label="Will Delete Next Cleanup"
                    value={stats.entriesToDelete}
                    alert={stats.entriesToDelete > 0}
                  />
                </View>

                {/* Preserved Data Section */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#10B981",
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Preserved Data ✓
                  </Text>
                  <StatRow
                    label="Daily Aggregates"
                    value={stats.dailyAggregates}
                    success
                  />
                  <StatRow
                    label="Weekly Summaries"
                    value={stats.weeklySummaries}
                    success
                  />
                </View>

                {/* Dates Section */}
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#64748B",
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Cleanup Info
                  </Text>
                  <StatRow
                    label="Last Cleanup"
                    value={formatDate(stats.lastCleanupDate)}
                    isDate
                  />
                  <StatRow
                    label="Oldest Entry"
                    value={formatDate(stats.oldestEntryDate)}
                    isDate
                  />
                  <StatRow
                    label="Most Recent Entry"
                    value={formatDate(stats.mostRecentEntryDate)}
                    isDate
                  />
                  <StatRow
                    label="Cutoff Date (40 days)"
                    value={formatDate(stats.cutoffDate)}
                    isDate
                  />
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function StatRow({ label, value, alert, success, isDate }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: "#475569",
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: alert ? "#EF4444" : success ? "#10B981" : "#0F172A",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
