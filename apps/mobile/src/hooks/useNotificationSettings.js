import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getCache, setCache, CACHE_KEYS } from "@/utils/dataCache";
import {
  requestNotificationPermissions,
  scheduleDailyReminders,
  cancelAllReminders,
} from "@/utils/notifications";

export function useNotificationSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotificationSettings = async () => {
    try {
      setIsLoading(true);

      // Always fetch from database to ensure we have the latest state
      const response = await fetchWithAuth("/api/notification-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch notification settings");
      }

      const data = await response.json();
      const enabled = data.notifications_enabled || false;
      const times = data.notification_times
        ? data.notification_times.split(",")
        : ["09:00", "12:00", "17:00"]; // Default: 9am, 12pm, 5pm daily

      setNotificationsEnabled(enabled);
      setNotificationTimes(times);

      // Update cache
      await setCache(CACHE_KEYS.NOTIFICATION_SETTINGS, data);

      // If notifications are enabled, make sure they're scheduled
      if (enabled) {
        console.log(
          "📱 Notifications enabled - ensuring daily repeating reminders are scheduled",
        );
        await scheduleDailyReminders(times);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching notification settings:", err);
      setIsLoading(false);
    }
  };

  const handleNotificationToggle = async (value) => {
    try {
      if (value) {
        // Request permissions first
        const granted = await requestNotificationPermissions();

        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive water reminders.",
          );
          return;
        }

        // Default: Daily reminders at 9am, 12pm, 5pm
        const timesToSchedule = ["09:00", "12:00", "17:00"];

        // Schedule repeating daily notifications
        await scheduleDailyReminders(timesToSchedule);

        // Update state immediately
        setNotificationsEnabled(true);
        setNotificationTimes(timesToSchedule);

        // Save to database
        const response = await fetchWithAuth("/api/notification-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notifications_enabled: true,
            notification_times: timesToSchedule.join(","),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save notification settings");
        }

        // Update cache
        await setCache(CACHE_KEYS.NOTIFICATION_SETTINGS, {
          notifications_enabled: true,
          notification_times: timesToSchedule.join(","),
        });

        Alert.alert(
          "Reminders Enabled! 💧",
          "You'll get daily water reminders at 9am, 12pm, and 5pm.",
        );
      } else {
        // Cancel all notifications
        await cancelAllReminders();

        // Update state immediately
        setNotificationsEnabled(false);

        // Save to database
        const response = await fetchWithAuth("/api/notification-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notifications_enabled: false,
            notification_times: notificationTimes.join(","),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save notification settings");
        }

        // Update cache
        await setCache(CACHE_KEYS.NOTIFICATION_SETTINGS, {
          notifications_enabled: false,
          notification_times: notificationTimes.join(","),
        });
      }
    } catch (err) {
      console.error("Error toggling notifications:", err);
      Alert.alert(
        "Error",
        "Failed to update notification settings. Please try again.",
      );
    }
  };

  return {
    notificationsEnabled,
    notificationTimes,
    isLoading,
    fetchNotificationSettings,
    handleNotificationToggle,
  };
}
