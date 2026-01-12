import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function ConsistencySection({ data, scale }) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  const stats = [
    {
      label: "Goal Days",
      value: `${data.summary.daysGoalMet}/7`,
      color: "#0EA5E9",
      icon: "🎯",
    },
    {
      label: "Best Streak",
      value: `${data.summary.longestStreak}`,
      subtext: data.summary.longestStreak === 1 ? "day" : "days",
      color: "#8B5CF6",
      icon: "🔥",
    },
    {
      label: "Highest",
      value: `${formatWaterAmount(data.summary.highestDay.ounces, waterUnit)}`,
      subtext: getUnitLabel(waterUnit),
      color: "#10B981",
      icon: "⬆️",
    },
    {
      label: "Lowest",
      value: `${formatWaterAmount(data.summary.lowestDay.ounces, waterUnit)}`,
      subtext: getUnitLabel(waterUnit),
      color: "#F59E0B",
      icon: "⬇️",
    },
  ];

  const fadeAnims = useRef(stats.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      100,
      fadeAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

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
        Performance
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {stats.map((stat, index) => (
          <Animated.View
            key={index}
            style={{
              width: "48%",
              backgroundColor: "#FFFFFF",
              padding: 16 * scale,
              borderRadius: 12 * scale,
              marginBottom: 12 * scale,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              opacity: fadeAnims[index],
            }}
          >
            <Text style={{ fontSize: 20 * scale, marginBottom: 8 * scale }}>
              {stat.icon}
            </Text>
            <Text
              style={{
                fontSize: 11 * scale,
                color: "#64748B",
                marginBottom: 4 * scale,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {stat.label}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 4 * scale,
              }}
            >
              <Text
                style={{
                  fontSize: 24 * scale,
                  fontWeight: "800",
                  color: stat.color,
                }}
              >
                {stat.value}
              </Text>
              {stat.subtext && (
                <Text
                  style={{
                    fontSize: 12 * scale,
                    fontWeight: "600",
                    color: "#64748B",
                  }}
                >
                  {stat.subtext}
                </Text>
              )}
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}
