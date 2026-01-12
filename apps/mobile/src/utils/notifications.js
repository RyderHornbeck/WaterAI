import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show notifications even when app is in foreground
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions() {
  try {
    // CRITICAL: On Android 13+, you MUST create a channel BEFORE requesting permissions
    // Otherwise the permission prompt won't even appear!
    if (Platform.OS === "android") {
      console.log("📱 Creating Android notification channel...");
      await Notifications.setNotificationChannelAsync("water-reminders", {
        name: "Water Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
      console.log("✅ Notification channel created");
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    console.log("📱 Current notification permission status:", existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("📱 Requesting notification permissions...");

      // CRITICAL FOR iOS: You MUST specify iOS permission options
      // Without these, notifications won't work in TestFlight/production builds
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
          allowProvisional: false,
          allowAnnouncements: false,
        },
      });

      finalStatus = status;
      console.log("📱 Permission result:", status);
    }

    if (finalStatus === "granted") {
      console.log("✅ Notification permissions granted!");

      // For iOS, verify individual permissions
      if (Platform.OS === "ios") {
        const { ios } = await Notifications.getPermissionsAsync();
        console.log("🍎 iOS notification permissions:", {
          allowsAlert: ios?.allowsAlert,
          allowsBadge: ios?.allowsBadge,
          allowsSound: ios?.allowsSound,
        });

        if (!ios?.allowsAlert) {
          console.warn(
            "⚠️ iOS notifications won't show - Alert permission not granted",
          );
        }
      }

      return true;
    } else {
      console.log("❌ Notification permissions denied");
      return false;
    }
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
}

// Schedule daily water reminder notifications
export async function scheduleDailyReminders(
  times = ["09:00", "12:00", "17:00"],
) {
  try {
    console.log("📱 Starting to schedule daily repeating reminders...");

    // Cancel all existing notifications first to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🗑️ Cleared all existing scheduled notifications");

    const identifiers = [];

    const messages = [
      "💧 Time to hydrate! Remember to drink water",
      "🌊 Stay refreshed! Don't forget your water",
      "💙 Your body needs water! Take a sip",
    ];

    for (let i = 0; i < times.length; i++) {
      const [hour, minute] = times[i].split(":").map(Number);

      console.log(
        `⏰ Scheduling daily repeating notification ${i + 1} for ${hour}:${minute < 10 ? "0" + minute : minute}`,
      );

      // CRITICAL: Use CALENDAR trigger for true daily repeating notifications
      // This will fire EVERY DAY at the specified time, not just once
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Water Reminder",
          body: messages[i % messages.length],
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: "water-reminder",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hour,
          minute: minute,
          repeats: true, // ← CRITICAL: This makes it repeat daily
        },
      });

      identifiers.push(identifier);
      console.log(`✅ Notification ${i + 1} scheduled with ID: ${identifier}`);
      console.log(
        `   Will fire daily at ${hour}:${minute < 10 ? "0" + minute : minute}`,
      );
    }

    // Verify scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Total scheduled notifications: ${scheduled.length}`);
    scheduled.forEach((notif, index) => {
      console.log(
        `   ${index + 1}. ${notif.content.title} - Repeats: ${notif.trigger.repeats}`,
      );
    });

    return identifiers;
  } catch (error) {
    console.error("❌ Error scheduling notifications:", error);
    return [];
  }
}

// Set up notification received listener (when notification is delivered)
// This fires when notification arrives, regardless of user interaction
export function setupNotificationReceivedHandler() {
  return Notifications.addNotificationReceivedListener((notification) => {
    console.log(
      "📬 Notification received:",
      notification.request.content.title,
    );
    // Notification will auto-repeat daily, no rescheduling needed
  });
}

// Set up notification response handler (when user taps notification)
export function setupNotificationResponseHandler() {
  return Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      console.log(
        "👆 User tapped notification:",
        response.notification.request.content.title,
      );
      // With repeating CALENDAR triggers, no need to reschedule
      // Notification will automatically fire again tomorrow
    },
  );
}

// Cancel all scheduled notifications
export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🗑️ All notification reminders canceled");
    return true;
  } catch (error) {
    console.error("❌ Error canceling notifications:", error);
    return false;
  }
}

// Get all scheduled notifications (for debugging/display)
export async function getScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Found ${scheduled.length} scheduled notifications`);
    return scheduled;
  } catch (error) {
    console.error("❌ Error getting scheduled notifications:", error);
    return [];
  }
}
