import { View, Text } from "react-native";

export function Header({ progress }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 6,
          letterSpacing: -0.5,
        }}
      >
        Today's Hydration
      </Text>
      <Text style={{ fontSize: 15, color: "#64748B", fontWeight: "500" }}>
        {progress >= 100
          ? "Goal achieved! Keep it up 🎉"
          : `${Math.round(100 - progress)}% until your goal`}
      </Text>

      {/* Subtle horizontal divider line */}
      <View
        style={{
          marginTop: 16,
          height: 1,
          backgroundColor: "#E2E8F0",
          opacity: 0.6,
        }}
      />
    </View>
  );
}
