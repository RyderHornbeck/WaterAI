import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function GlassCup({
  fillPercent,
  drankOz,
  goalOz,
  dayLabel,
  onPress,
  scale = 1,
}) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const cupWidth = 48 * scale;
  const cupHeight = 100 * scale;
  const fillHeight = Math.max(cupHeight * fillPercent, 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ alignItems: "center", marginBottom: 12 * scale }}
    >
      <Text
        style={{
          fontSize: 12 * scale,
          fontWeight: "600",
          color: "#64748B",
          marginBottom: 6 * scale,
        }}
      >
        {dayLabel}
      </Text>
      <View
        style={{
          width: cupWidth,
          height: cupHeight,
          backgroundColor: "rgba(224, 242, 254, 0.3)",
          borderRadius: 8 * scale,
          borderWidth: 2.5 * scale,
          borderColor: "#BFDBFE",
          overflow: "hidden",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            width: "100%",
            height: fillHeight,
            backgroundColor: "#0EA5E9",
            borderRadius: 5 * scale,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 8 * scale,
            left: 6 * scale,
            width: 12 * scale,
            height: 30 * scale,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 6 * scale,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 11 * scale,
          color: "#1E293B",
          marginTop: 6 * scale,
          fontWeight: "600",
        }}
      >
        {formatWaterAmount(drankOz, waterUnit)}/
        {formatWaterAmount(goalOz, waterUnit)}
        {getUnitLabel(waterUnit)}
      </Text>
    </TouchableOpacity>
  );
}
