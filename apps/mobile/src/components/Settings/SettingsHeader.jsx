import { View, Text } from "react-native";

export function SettingsHeader() {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
      <Text
        style={{
          fontSize: 32,
          fontWeight: "800",
          color: "#0F172A",
          marginBottom: 8,
        }}
      >
        Settings
      </Text>
      <Text style={{ fontSize: 16, color: "#64748B" }}>
        Your account and progress
      </Text>
    </View>
  );
}
