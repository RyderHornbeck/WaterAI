import { useState } from "react";
import { Alert } from "react-native";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useDataCleanup() {
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const handleCleanupOldData = async (onComplete) => {
    Alert.alert(
      "Clean Up Old Data",
      "This will HARD DELETE entries and images older than 40 days (based on a rolling window from your most recent entry). Daily totals and weekly summaries will be preserved for long-term analytics. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Hard Delete",
          style: "destructive",
          onPress: async () => {
            setCleanupLoading(true);
            try {
              const response = await fetchWithAuth("/api/cleanup-old-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ force: true }), // ✅ Force cleanup even if already ran today
              });

              if (!response.ok) {
                throw new Error("Cleanup failed");
              }

              const data = await response.json();

              // ✅ Build detailed message about what was deleted
              let detailMessage = `Hard deleted ${data.entriesProcessed} old entries and ${data.imagesDeleted} images.\n\n`;

              // Add breakdown by type if available
              if (
                data.deletionDetails?.byType &&
                Object.keys(data.deletionDetails.byType).length > 0
              ) {
                detailMessage += "By Type:\n";
                for (const [type, count] of Object.entries(
                  data.deletionDetails.byType,
                )) {
                  const displayType = type
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());
                  detailMessage += `  • ${displayType}: ${count}\n`;
                }
              }

              // Add breakdown by liquid type if available
              if (
                data.deletionDetails?.byLiquid &&
                Object.keys(data.deletionDetails.byLiquid).length > 0
              ) {
                detailMessage += "\nBy Liquid:\n";
                for (const [liquid, count] of Object.entries(
                  data.deletionDetails.byLiquid,
                )) {
                  const displayLiquid =
                    liquid.charAt(0).toUpperCase() + liquid.slice(1);
                  detailMessage += `  • ${displayLiquid}: ${count}\n`;
                }
              }

              detailMessage +=
                "\nDaily aggregates and weekly summaries preserved.";

              Alert.alert("Cleanup Complete ✓", detailMessage);

              // Call the callback to refresh stats
              if (onComplete) {
                onComplete();
              }
            } catch (err) {
              console.error("Error running cleanup:", err);
              Alert.alert(
                "Error",
                "Failed to clean up old data. Please try again later.",
              );
            } finally {
              setCleanupLoading(false);
            }
          },
        },
      ],
    );
  };

  return { cleanupLoading, handleCleanupOldData };
}
