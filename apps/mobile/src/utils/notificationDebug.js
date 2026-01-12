import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";

/**
 * Debug helper to check notification status and log detailed info
 */
export async function debugNotificationStatus() {
  console.log("\n========== NOTIFICATION DEBUG INFO ==========");

  try {
    // Check permissions
    const { status, ios, android } = await Notifications.getPermissionsAsync();
    console.log("📱 Permission Status:", status);

    if (Platform.OS === "ios") {
      console.log("🍎 iOS Permissions:", {
        status: ios?.status,
        allowsAlert: ios?.allowsAlert,
        allowsBadge: ios?.allowsBadge,
        allowsSound: ios?.allowsSound,
        allowsDisplayInCarPlay: ios?.allowsDisplayInCarPlay,
        allowsCriticalAlerts: ios?.allowsCriticalAlerts,
        allowsAnnouncements: ios?.allowsAnnouncements,
      });

      // Critical warnings for iOS
      if (status === "granted" && !ios?.allowsAlert) {
        console.warn(
          "⚠️ CRITICAL: Notifications are 'granted' but allowsAlert is false!",
        );
        console.warn(
          "   This means notifications won't actually show on the device.",
        );
        console.warn(
          "   User needs to enable notifications in iOS Settings > [Your App] > Notifications",
        );
      }
    }

    if (Platform.OS === "android") {
      console.log("🤖 Android Permissions:", android);
    }

    // Check scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`\n📊 Scheduled Notifications: ${scheduled.length}`);

    scheduled.forEach((notif, index) => {
      console.log(`\n   Notification ${index + 1}:`);
      console.log(`   - ID: ${notif.identifier}`);
      console.log(`   - Title: ${notif.content.title}`);
      console.log(`   - Body: ${notif.content.body}`);
      console.log(`   - Trigger:`, notif.trigger);
    });

    // Check notification channels (Android only)
    if (Platform.OS === "android") {
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log(`\n📢 Notification Channels: ${channels?.length || 0}`);
      channels?.forEach((channel) => {
        console.log(`   - ${channel.name} (${channel.id})`);
        console.log(`     Importance: ${channel.importance}`);
      });
    }

    console.log("\n=========================================\n");

    return {
      permissionStatus: status,
      scheduledCount: scheduled.length,
      scheduled,
      ios,
      android,
    };
  } catch (error) {
    console.error("❌ Error getting notification debug info:", error);
    return null;
  }
}

/**
 * Comprehensive notification diagnostic that shows results to user
 */
export async function runNotificationDiagnostic() {
  try {
    const result = await debugNotificationStatus();

    if (!result) {
      Alert.alert(
        "Diagnostic Failed",
        "Could not run notification diagnostic. Check console for errors.",
      );
      return;
    }

    let message = `Permission: ${result.permissionStatus}\n`;
    message += `Scheduled: ${result.scheduledCount} notifications\n\n`;

    if (Platform.OS === "ios") {
      message += "iOS Permissions:\n";
      message += `  Alert: ${result.ios?.allowsAlert ? "✅" : "❌"}\n`;
      message += `  Badge: ${result.ios?.allowsBadge ? "✅" : "❌"}\n`;
      message += `  Sound: ${result.ios?.allowsSound ? "✅" : "❌"}\n`;

      if (result.permissionStatus === "granted" && !result.ios?.allowsAlert) {
        message += "\n⚠️ PROBLEM FOUND:\n";
        message +=
          "Notifications are granted but won't show because Alert is disabled.\n\n";
        message += "Fix: Go to iOS Settings > [App Name] > Notifications";
        message += " and enable 'Allow Notifications'";
      }
    }

    if (result.scheduledCount === 0) {
      message += "\n⚠️ No notifications are scheduled!";
    }

    Alert.alert("Notification Diagnostic", message, [{ text: "OK" }]);
  } catch (error) {
    console.error("Error running diagnostic:", error);
    Alert.alert("Diagnostic Error", error.message);
  }
}

/**
 * Test notification - schedules a notification 5 seconds from now
 */
export async function sendTestNotification() {
  try {
    console.log("🧪 Scheduling test notification in 5 seconds...");

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 💧",
        body: "If you see this, notifications are working!",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });

    console.log(`✅ Test notification scheduled with ID: ${id}`);
    console.log("⏰ You should receive it in 5 seconds");

    Alert.alert(
      "Test Notification Scheduled",
      "You should receive a notification in 5 seconds. Close the app to test background delivery.",
      [{ text: "OK" }],
    );

    return id;
  } catch (error) {
    console.error("❌ Error scheduling test notification:", error);
    Alert.alert("Test Failed", error.message);
    return null;
  }
}
