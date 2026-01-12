import { useEffect, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/**
 * Hook that runs cleanup in the background every time the app is opened.
 * Uses a 40-day rolling window from the most recent entry date.
 * Only runs once per day (resets at 12:00 AM user time).
 * SECURITY: Uses fetchWithAuth to include authentication token
 */
export function useBackgroundCleanup() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    const runCleanup = async () => {
      // Prevent multiple simultaneous cleanup runs
      if (isRunningRef.current) {
        console.log("⏭️ Cleanup already running, skipping...");
        return;
      }

      try {
        console.log("🧹 Running background cleanup (40-day rolling window)...");
        isRunningRef.current = true;

        // Run cleanup in the background (don't await or block UI)
        // Note: Background cleanup does NOT send force: true, so it respects the once-per-day limit
        fetchWithAuth("/api/cleanup-old-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
          .then(async (response) => {
            if (response.ok) {
              const result = await response.json();

              // Check if cleanup was skipped (already ran today)
              if (result.skipped) {
                console.log(
                  "⏭️ Background cleanup already ran today. Resets at 12:00 AM user time.",
                );
                console.log(`   Next cleanup: ${result.nextCleanup}`);
              } else {
                // Cleanup actually ran
                console.log("✅ Background cleanup completed:", result);

                // Log deletion details if available
                if (result.deletionDetails) {
                  console.log("   Deletion breakdown:");
                  if (result.deletionDetails.byType) {
                    console.log("   By Type:", result.deletionDetails.byType);
                  }
                  if (result.deletionDetails.byLiquid) {
                    console.log(
                      "   By Liquid:",
                      result.deletionDetails.byLiquid,
                    );
                  }
                }
              }
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.warn("⚠️ Background cleanup failed:", {
                status: response.status,
                error: errorData.error,
                details: errorData.details,
              });
            }
          })
          .catch((error) => {
            console.warn("⚠️ Background cleanup error:", {
              message: error.message,
              stack: error.stack,
            });
          })
          .finally(() => {
            isRunningRef.current = false;
          });

        console.log("🧹 Background cleanup initiated (running in background)");
      } catch (error) {
        console.error("Error running cleanup:", {
          message: error.message,
          stack: error.stack,
        });
        isRunningRef.current = false;
      }
    };

    // Run the cleanup after a short delay to not block app startup
    const timer = setTimeout(runCleanup, 2000);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - runs every time component mounts (app opens)
}
