import { View, Text, Dimensions } from "react-native";
import { AnalogClock } from "../AnalogClock/AnalogClock";

export function HumanSilhouette({
  progress,
  todayTotal,
  dailyGoal,
  entries = [],
}) {
  // Get screen dimensions and calculate scale factor
  const screenWidth = Dimensions.get("window").width;
  const scale = Math.min(screenWidth / 390, 1.2);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      {/* Analog Clock with water entries */}
      <AnalogClock size={320} entries={entries} dailyGoal={dailyGoal} />

      {/* Stats below clock - matching WaterBottle UI */}
      <View style={{ alignItems: "center", marginTop: 16 * scale }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            marginBottom: 12 * scale,
          }}
        >
          <Text
            style={{
              fontSize: 56 * scale,
              fontWeight: "800",
              color: "#0EA5E9",
              letterSpacing: -2 * scale,
            }}
          >
            {todayTotal}
          </Text>
          <Text
            style={{
              fontSize: 20 * scale,
              color: "#94A3B8",
              marginLeft: 8 * scale,
              fontWeight: "600",
            }}
          >
            / {dailyGoal} oz
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#F0F9FF",
            paddingHorizontal: 20 * scale,
            paddingVertical: 10 * scale,
            borderRadius: 16 * scale,
          }}
        >
          <Text
            style={{
              fontSize: 15 * scale,
              fontWeight: "700",
              color: "#0EA5E9",
              letterSpacing: 0.5 * scale,
            }}
          >
            {Math.min(Math.round(progress), 100)}% COMPLETE
          </Text>
        </View>
      </View>
    </View>
  );
}
