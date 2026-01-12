import React from "react";
import { View, Text } from "react-native";
import { PieChart } from "./PieChart";

export function LiquidTypesSection({ data, scale }) {
  const pieSize = 180 * scale;
  const { liquidTypes } = data;
  const total = Object.values(liquidTypes.data).reduce(
    (sum, val) => sum + val,
    0,
  );

  if (total === 0) return null;

  const colorMap = {
    water: "#1E90FF", // Bright Blue
    soda: "#FF6B00", // Bright Orange
    "diet soda": "#FF1493", // Hot Pink
    coffee: "#5D4037", // Rich Brown
    tea: "#7FFF00", // Lime Green
    "sports drink": "#00CED1", // Bright Cyan
    "energy drink": "#FF0000", // Pure Red
    juice: "#FFD700", // Golden Yellow
    milk: "#E8E8E8", // Light Gray (visible against white)
    smoothie: "#9370DB", // Medium Purple
    alcohol: "#FF00FF", // Magenta
    other: "#424242", // Dark Gray
  };

  const segments = Object.entries(liquidTypes.data)
    .map(([type, value]) => {
      // Special case for smoothie
      if (type.toLowerCase() === "smoothie") {
        return {
          label: "Smoothie/Shake",
          value,
          color: colorMap[type.toLowerCase()] || "#64748B",
        };
      }

      // Capitalize each word properly
      const label = type
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return {
        label,
        value,
        color: colorMap[type.toLowerCase()] || "#64748B",
      };
    })
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value); // Sort from biggest to smallest

  const waterPercentage = liquidTypes.waterPercentage;
  const showWarning = waterPercentage < 60;
  const showPositive = waterPercentage >= 60;

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
        Hydration Sources
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
            total={total}
            scale={scale}
          />

          {/* Feedback */}
          {showWarning && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                padding: 14 * scale,
                borderRadius: 12 * scale,
                marginTop: 20 * scale,
                borderLeftWidth: 3 * scale,
                borderLeftColor: "#F59E0B",
              }}
            >
              <Text
                style={{
                  fontSize: 13 * scale,
                  color: "#92400E",
                  lineHeight: 18 * scale,
                  fontWeight: "600",
                }}
              >
                Consider drinking more plain water for optimal hydration
              </Text>
            </View>
          )}

          {showPositive && (
            <View
              style={{
                backgroundColor: "#D1FAE5",
                padding: 14 * scale,
                borderRadius: 12 * scale,
                marginTop: 20 * scale,
                borderLeftWidth: 3 * scale,
                borderLeftColor: "#10B981",
              }}
            >
              <Text
                style={{
                  fontSize: 13 * scale,
                  color: "#065F46",
                  lineHeight: 18 * scale,
                  fontWeight: "600",
                }}
              >
                Great! Most of your hydration came from water
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
