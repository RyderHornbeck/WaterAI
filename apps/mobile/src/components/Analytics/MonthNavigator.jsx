import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

export function MonthNavigator({ currentMonth, onNavigate, scale = 1 }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16 * scale,
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
          fontSize: 20 * scale,
          fontWeight: "700",
          color: "#1E293B",
        }}
      >
        {currentMonth.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })}
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
