import React from "react";
import { View, Text } from "react-native";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function ComparisonSection({ data, scale }) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const { comparison } = data;
  const averageUp = comparison.averageChange > 0;
  const goalsUp = comparison.goalsMetChange > 0;
  const goalsFlat = comparison.goalsMetChange === 0;

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
        Week-Over-Week
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 16 * scale,
          borderRadius: 12 * scale,
          marginBottom: 12 * scale,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6 * scale,
          }}
        >
          {averageUp ? (
            <TrendingUp size={20 * scale} color="#10B981" />
          ) : (
            <TrendingDown size={20 * scale} color="#EF4444" />
          )}
          <Text
            style={{
              fontSize: 20 * scale,
              fontWeight: "800",
              color: averageUp ? "#10B981" : "#EF4444",
              marginLeft: 8 * scale,
            }}
          >
            {averageUp ? "+" : ""}
            {formatWaterAmount(comparison.averageChange, waterUnit)}{" "}
            {getUnitLabel(waterUnit)}
          </Text>
        </View>
        <Text
          style={{ fontSize: 13 * scale, color: "#64748B", fontWeight: "500" }}
        >
          vs last week (
          {formatWaterAmount(comparison.previousAverage, waterUnit)}{" "}
          {getUnitLabel(waterUnit)}/day)
        </Text>
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 16 * scale,
          borderRadius: 12 * scale,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6 * scale,
          }}
        >
          {goalsFlat ? (
            <View
              style={{
                width: 20 * scale,
                height: 20 * scale,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 12 * scale,
                  height: 2 * scale,
                  backgroundColor: "#94A3B8",
                  borderRadius: 1 * scale,
                }}
              />
            </View>
          ) : goalsUp ? (
            <TrendingUp size={20 * scale} color="#10B981" />
          ) : (
            <TrendingDown size={20 * scale} color="#EF4444" />
          )}
          <Text
            style={{
              fontSize: 20 * scale,
              fontWeight: "800",
              color: goalsFlat ? "#94A3B8" : goalsUp ? "#10B981" : "#EF4444",
              marginLeft: 8 * scale,
            }}
          >
            {goalsUp && !goalsFlat ? "+" : ""}
            {comparison.goalsMetChange}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 13 * scale,
            color: "#64748B",
            fontWeight: "500",
          }}
        >
          {Math.abs(comparison.goalsMetChange) === 1 ? "day" : "days"} hitting
          goal vs last week
        </Text>
      </View>
    </View>
  );
}
