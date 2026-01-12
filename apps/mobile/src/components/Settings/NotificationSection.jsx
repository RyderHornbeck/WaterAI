import { View, Text, Switch } from "react-native";
import { Bell } from "lucide-react-native";

export function NotificationSection({ notificationsEnabled, onToggle }) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
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
        Reminders
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
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
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
              <Bell color="#0EA5E9" size={24} />
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
                Daily Reminder
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  lineHeight: 18,
                }}
              >
                Get reminded throughout the day
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggle}
            trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
            thumbColor={notificationsEnabled ? "#0EA5E9" : "#F1F5F9"}
            ios_backgroundColor="#CBD5E1"
          />
        </View>
      </View>
    </View>
  );
}
