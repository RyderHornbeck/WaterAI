import React from "react";
import { View, Text } from "react-native";
import { PieChart } from "./PieChart";

export function TimeOfDaySection({ data, scale }) {
  const pieSize = 180 * scale;
  const { timeOfDay } = data;
  const total = Object.values(timeOfDay.data).reduce(
    (sum, val) => sum + val,
    0,
  );

  if (total === 0) return null;

  // Time bucket labels with time ranges
  const timeLabels = {
    earlyMorning: "12am-6am",
    morning: "6am-12pm",
    afternoon: "12pm-5pm",
    evening: "5pm-9pm",
    night: "9pm-12am",
  };

  // Friendly labels for insights
  const friendlyLabels = {
    earlyMorning: "early morning",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
  };

  // Consistent colors for each time period
  const timeColors = {
    earlyMorning: "#3B82F6", // Blue
    morning: "#F97316", // Orange
    afternoon: "#EC4899", // Pink
    evening: "#10B981", // Green
    night: "#EF4444", // Red
  };

  const segments = [
    {
      label: timeLabels.earlyMorning,
      value: timeOfDay.percentages.earlyMorning,
      color: timeColors.earlyMorning,
    },
    {
      label: timeLabels.morning,
      value: timeOfDay.percentages.morning,
      color: timeColors.morning,
    },
    {
      label: timeLabels.afternoon,
      value: timeOfDay.percentages.afternoon,
      color: timeColors.afternoon,
    },
    {
      label: timeLabels.evening,
      value: timeOfDay.percentages.evening,
      color: timeColors.evening,
    },
    {
      label: timeLabels.night,
      value: timeOfDay.percentages.night,
      color: timeColors.night,
    },
  ]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value); // Sort from biggest to smallest

  // Calculate sum for pie chart (using percentages that should sum to 100)
  const percentageSum = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <View style={{ paddingHorizontal: 20 * scale, paddingTop: 24 * scale }}>
      <Text
        style={{
          fontSize: 18 * scale,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16 * scale,
        }}
      >
        When You Drink
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16 * scale,
          padding: 20 * scale,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View style={{ alignItems: "center" }}>
          <PieChart
            segments={segments}
            size={pieSize}
            total={percentageSum}
            scale={scale}
          />

          {/* Insight */}
          <View
            style={{
              backgroundColor: "#DBEAFE",
              padding: 14 * scale,
              borderRadius: 12 * scale,
              marginTop: 20 * scale,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: 13 * scale,
                color: "#0369A1",
                textAlign: "center",
                lineHeight: 18 * scale,
                fontWeight: "600",
              }}
            >
              {timeOfDay.dominantTime
                ? `Most intake during ${friendlyLabels[timeOfDay.dominantTime]}`
                : "No data available"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
