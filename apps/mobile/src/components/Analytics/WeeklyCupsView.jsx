import React from "react";
import { View, Animated, Text } from "react-native";
import { GlassCup } from "./GlassCup";

export function WeeklyCupsView({
  weekDates,
  getOuncesForDate,
  dailyGoal,
  formatDayLabel,
  handleDayPress,
  slideAnim,
  containerWidth,
  scale,
  dailyGoals, // NEW: map of date -> goal for that specific day
}) {
  // Helper to get the goal for a specific date
  const getGoalForDate = (date) => {
    if (!dailyGoals) return dailyGoal;
    const dateKey = date.toISOString().split("T")[0];
    return dailyGoals[dateKey] || dailyGoal;
  };

  return (
    <View
      style={{
        width: containerWidth,
        paddingVertical: 24 * scale,
        paddingHorizontal: 16 * scale,
      }}
    >
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        {/* Top Row: Mon-Fri */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: 20 * scale,
          }}
        >
          {weekDates.slice(0, 5).map((date, index) => {
            const ounces = getOuncesForDate(date);
            const goalForDay = getGoalForDate(date); // Use historical goal
            const fillPercent = Math.min(ounces / goalForDay, 1.0);
            return (
              <GlassCup
                key={index}
                fillPercent={fillPercent}
                drankOz={ounces}
                goalOz={goalForDay} // Pass historical goal
                dayLabel={formatDayLabel(date, index)}
                onPress={() => handleDayPress(date)}
                scale={scale}
              />
            );
          })}
        </View>

        {/* Bottom Row: Sat-Sun */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            paddingHorizontal: containerWidth * 0.2,
          }}
        >
          {weekDates.slice(5, 7).map((date, index) => {
            const ounces = getOuncesForDate(date);
            const goalForDay = getGoalForDate(date); // Use historical goal
            const fillPercent = Math.min(ounces / goalForDay, 1.0);
            return (
              <GlassCup
                key={index + 5}
                fillPercent={fillPercent}
                drankOz={ounces}
                goalOz={goalForDay} // Pass historical goal
                dayLabel={formatDayLabel(date, index + 5)}
                onPress={() => handleDayPress(date)}
                scale={scale}
              />
            );
          })}
        </View>

        {/* Instruction text */}
        <Text
          style={{
            fontSize: 12 * scale,
            color: "#94A3B8",
            textAlign: "center",
            marginTop: 16 * scale,
            fontStyle: "italic",
          }}
        >
          Click a bottle to inspect that day
        </Text>
      </Animated.View>
    </View>
  );
}
