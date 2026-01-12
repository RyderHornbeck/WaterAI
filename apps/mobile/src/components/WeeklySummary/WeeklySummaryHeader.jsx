import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Droplet, X } from "lucide-react-native";

export function WeeklySummaryHeader({
  data,
  onClose,
  fadeAnim,
  slideAnim,
  scale,
}) {
  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} – ${endDate.toLocaleDateString("en-US", options)}`;
  };

  return (
    <View
      style={{
        borderTopLeftRadius: 28 * scale,
        borderTopRightRadius: 28 * scale,
        paddingTop: 24 * scale,
        paddingHorizontal: 20 * scale,
        paddingBottom: 20 * scale,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
        backgroundColor: "transparent",
        zIndex: 10,
      }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8 * scale,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8 * scale,
            }}
          >
            <Droplet size={28 * scale} color="#0EA5E9" fill="#0EA5E9" />
            <Text
              style={{
                fontSize: 24 * scale,
                fontWeight: "700",
                color: "#0F172A",
              }}
            >
              Weekly Summary
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32 * scale,
              height: 32 * scale,
              borderRadius: 16 * scale,
              backgroundColor: "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20 * scale} color="#64748B" />
          </TouchableOpacity>
        </View>
        {data && (
          <Text
            style={{
              fontSize: 14 * scale,
              color: "#64748B",
              fontWeight: "500",
            }}
          >
            {formatDateRange(data.weekRange.start, data.weekRange.end)}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}
