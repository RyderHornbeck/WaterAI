import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

export function WeekNavigator({
  selectedWeekStart,
  onNavigate,
  formatWeekRange,
  scale = 1,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24 * scale,
      }}
    >
      <TouchableOpacity
        onPress={() => onNavigate("left")}
        style={{
          width: 40 * scale,
          height: 40 * scale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F0F9FF",
          borderRadius: 20 * scale,
        }}
      >
        <ChevronLeft color="#3B82F6" size={24 * scale} />
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 18 * scale,
          fontWeight: "700",
          color: "#1E293B",
        }}
      >
        {formatWeekRange(selectedWeekStart)}
      </Text>

      <TouchableOpacity
        onPress={() => onNavigate("right")}
        style={{
          width: 40 * scale,
          height: 40 * scale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F0F9FF",
          borderRadius: 20 * scale,
        }}
      >
        <ChevronRight color="#3B82F6" size={24 * scale} />
      </TouchableOpacity>
    </View>
  );
}
