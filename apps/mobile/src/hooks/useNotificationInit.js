import { useEffect } from "react";
import { Platform } from "react-native";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import {
  scheduleDailyReminders,
  setupNotificationResponseHandler,
} from "@/utils/notifications";

/**
 * Initialize notifications on app startup
 * Ensures that if notifications are enabled, they're scheduled
 */
export function useNotificationInit() {
  useEffect(() => {
    // Skip notification setup on web - notifications only work on native platforms
    if (Platform.OS === "web") {
      return;
    }

    const initializeNotifications = async () => {
      try {
        console.log("📱 Initializing notification settings...");

        // Fetch current notification settings from database
        const response = await fetchWithAuth("/api/notification-settings");

        if (!response.ok) {
          // If unauthorized, user isn't logged in - skip notification init
          if (response.status === 401) {
            console.log(
              "📱 User not authenticated - skipping notification init",
            );
            return;
          }
          console.log("Could not fetch notification settings");
          return;
        }

        const data = await response.json();

        if (data.notifications_enabled) {
          const times = data.notification_times
            ? data.notification_times.split(",")
            : ["09:00", "12:00", "17:00"]; // Default: 9am, 12pm, 5pm daily

          console.log(
            "📱 Notifications enabled - scheduling daily repeating reminders for:",
            times,
          );
          await scheduleDailyReminders(times);
          console.log("✓ Daily repeating reminders scheduled successfully");
        } else {
          console.log("📱 Notifications disabled - no reminders scheduled");
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    // Run on app startup
    initializeNotifications();

    // Set up notification response handler
    const subscription = setupNotificationResponseHandler();

    // Clean up on unmount
    return () => {
      subscription.remove();
    };
  }, []);
}
