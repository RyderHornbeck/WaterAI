import React from "react";
import { View, Text, Animated } from "react-native";
import { CircularProgress } from "./CircularProgress";

export function MonthlyCalendar({
  monthDays,
  getProgressForDate,
  cellSize,
  scale,
  slideAnimMonth,
  dailyGoals, // NEW: map of date -> goal for that specific day
}) {
  // Helper to get progress using historical goal
  const getProgressWithHistoricalGoal = (date) => {
    if (!dailyGoals) {
      return getProgressForDate(date); // Fallback to original method
    }

    const dateKey = date.toISOString().split("T")[0];
    const goalForDay = dailyGoals[dateKey];

    if (!goalForDay) {
      return getProgressForDate(date); // Fallback if no goal found
    }

    // Calculate progress using historical goal (this assumes getProgressForDate returns {ounces, goal})
    // We need to recalculate with correct goal
    return getProgressForDate(date, goalForDay);
  };

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnimMonth }] }}>
      {/* Weekday Headers */}
      <View
        style={{
          flexDirection: "row",
          marginBottom: 8 * scale,
        }}
      >
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <View
            key={i}
            style={{
              width: cellSize,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12 * scale,
                fontWeight: "600",
                color: "#64748B",
              }}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {monthDays.map((date, index) => {
          if (!date) {
            return (
              <View
                key={`empty-${index}`}
                style={{ width: cellSize, height: cellSize }}
              />
            );
          }

          const progress = getProgressWithHistoricalGoal(date); // Use historical goal
          const dayNumber = date.getDate();
          // Reduced from 0.75 to 0.68 to prevent clipping on all devices
          const ringSize = cellSize * 0.68;

          return (
            <View
              key={index}
              style={{
                width: cellSize,
                height: cellSize,
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              <View
                style={{
                  width: ringSize,
                  height: ringSize,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "visible",
                }}
              >
                {progress > 0 && (
                  <CircularProgress
                    progress={progress}
                    size={ringSize}
                    scale={scale}
                  />
                )}
                <Text
                  style={{
                    fontSize: 14 * scale,
                    fontWeight: "600",
                    color: progress >= 100 ? "#0EA5E9" : "#1E293B",
                  }}
                >
                  {dayNumber}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
