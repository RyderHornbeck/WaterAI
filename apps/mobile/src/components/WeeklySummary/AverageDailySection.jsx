import React, { useEffect, useRef } from "react";
import { View, Text, Dimensions, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function AverageDailySection({ data, scale }) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 48 * scale;
  const chartHeight = 260 * scale;
  const barWidth = (chartWidth - 80 * scale) / 7;
  const maxValue = Math.max(
    ...data.dailyData.map((d) => d.ounces),
    data.dailyGoal * 1.2,
  );

  const barAnimations = useRef(
    data.dailyData.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.stagger(
      50,
      barAnimations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  return (
    <View style={{ paddingHorizontal: 20 * scale, paddingTop: 20 * scale }}>
      <Text
        style={{
          fontSize: 18 * scale,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16 * scale,
        }}
      >
        Daily Intake
      </Text>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 20 * scale,
          borderRadius: 16 * scale,
          marginBottom: 16 * scale,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <Text
          style={{
            fontSize: 40 * scale,
            fontWeight: "800",
            color: "#0EA5E9",
            textAlign: "center",
          }}
        >
          {formatWaterAmount(data.summary.averageDaily, waterUnit)}
        </Text>
        <Text
          style={{
            fontSize: 16 * scale,
            color: "#64748B",
            textAlign: "center",
            marginTop: 2 * scale,
            fontWeight: "600",
          }}
        >
          {getUnitLabel(waterUnit)} per day
        </Text>
      </View>

      {/* Bar Chart */}
      <View
        style={{
          height: chartHeight + 60 * scale,
          backgroundColor: "#FFFFFF",
          borderRadius: 16 * scale,
          padding: 20 * scale,
          paddingBottom: 24 * scale,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        {/* Day labels above the graph */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 12 * scale,
            marginBottom: 12 * scale,
          }}
        >
          {data.dailyData.map((day, index) => (
            <View
              key={index}
              style={{
                width: barWidth,
                marginHorizontal: 3 * scale,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13 * scale,
                  color: day.ounces >= data.dailyGoal ? "#0EA5E9" : "#94A3B8",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                {day.dayOfWeek.slice(0, 1)}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            height: chartHeight,
            alignItems: "flex-end",
            paddingHorizontal: 12 * scale,
            position: "relative",
          }}
        >
          {data.dailyData.map((day, index) => {
            const heightRatio = day.ounces / maxValue;
            const barHeight = heightRatio * chartHeight;
            const isGoalMet = day.ounces >= data.dailyGoal;

            return (
              <Animated.View
                key={index}
                style={{
                  width: barWidth,
                  height: barHeight,
                  marginHorizontal: 3 * scale,
                  opacity: barAnimations[index],
                  transform: [
                    {
                      scaleY: barAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                  borderRadius: 8 * scale,
                  overflow: "hidden",
                  backgroundColor: isGoalMet ? "#0EA5E9" : "#E0F2FE",
                }}
              >
                <LinearGradient
                  colors={
                    isGoalMet ? ["#38BDF8", "#0EA5E9"] : ["#E0F2FE", "#BAE6FD"]
                  }
                  style={{
                    flex: 1,
                    borderRadius: 8 * scale,
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 16 * scale,
            gap: 24 * scale,
          }}
        >
          {/* Lighter blue - Goal not met */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8 * scale,
            }}
          >
            <View
              style={{
                width: 24 * scale,
                height: 12 * scale,
                borderRadius: 6 * scale,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#E0F2FE", "#BAE6FD"]}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </View>
            <Text
              style={{
                fontSize: 13 * scale,
                color: "#64748B",
                fontWeight: "600",
              }}
            >
              Goal not met
            </Text>
          </View>

          {/* Darker blue - Goal met */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8 * scale,
            }}
          >
            <View
              style={{
                width: 24 * scale,
                height: 12 * scale,
                borderRadius: 6 * scale,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#38BDF8", "#0EA5E9"]}
                style={{ flex: 1 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </View>
            <Text
              style={{
                fontSize: 13 * scale,
                color: "#64748B",
                fontWeight: "600",
              }}
            >
              Goal met
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
