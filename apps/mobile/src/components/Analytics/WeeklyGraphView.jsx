import React from "react";
import { View, Text, Dimensions } from "react-native";
import Svg, {
  Path,
  Line as SvgLine,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function WeeklyGraphView({
  graphData,
  dailyGoal, // This is now the max goal for Y-axis scaling
  containerWidth,
  scale,
  graphKey,
}) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const dayLabels = ["M", "T", "W", "Th", "F", "Sa", "Su"];
  const screenWidth = Dimensions.get("window").width;
  const isSmallDevice = screenWidth < 375;
  const isLargeDevice = screenWidth > 428;

  // Find the maximum goal across all days for Y-axis scaling
  const maxGoalInWeek = Math.max(
    ...graphData.map((d) => d.dailyGoal || dailyGoal),
    dailyGoal,
  );

  // 7 Y-axis ticks with max goal on the 5th (from bottom)
  const maxYValue = maxGoalInWeek * 1.5;
  const yAxisTicks = [
    maxYValue, // 7th (top)
    maxGoalInWeek * 1.25, // 6th
    maxGoalInWeek, // 5th - MAX GOAL LINE
    maxGoalInWeek * 0.75, // 4th
    maxGoalInWeek * 0.5, // 3rd
    maxGoalInWeek * 0.25, // 2nd
    0, // 1st (bottom)
  ].map((tick) => (waterUnit === "oz" ? Math.round(tick) : tick)); // Round to whole numbers in oz mode

  // Responsive sizing - smaller dots
  const baseCircleRadius = isSmallDevice ? 2.5 : isLargeDevice ? 4 : 3;
  const circleRadius = baseCircleRadius * scale;
  const circlePadding = circleRadius + 4 * scale; // Dynamic padding based on circle size

  // Graph dimensions - more height on larger devices
  const baseGraphHeight = isSmallDevice ? 220 : isLargeDevice ? 280 : 250;
  const graphHeight = baseGraphHeight * scale;

  // Y-axis width adjusts based on goal magnitude
  const maxLabelLength = Math.round(maxYValue).toString().length;
  const yAxisWidth = Math.max(40, maxLabelLength * 10) * scale;

  // Calculate available width and center the graph
  const totalHorizontalPadding = 16 * scale; // Minimal padding from edges
  const availableWidth = containerWidth - totalHorizontalPadding;
  const graphWidth = availableWidth - yAxisWidth - circlePadding * 2;

  // Convert ounces to Y position
  const ouncesToY = (ounces) => {
    const cappedOunces = Math.min(ounces, maxYValue);
    return (
      graphHeight -
      circlePadding -
      (cappedOunces / maxYValue) * (graphHeight - circlePadding * 2)
    );
  };

  // Create path data for the line graph
  const createLinePath = () => {
    if (graphData.length === 0) return "";

    const pointSpacing = graphWidth / (graphData.length - 1);

    let path = "";
    graphData.forEach((point, index) => {
      const x = circlePadding + index * pointSpacing;
      const y = ouncesToY(point.value);

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  // Create filled area path
  const createFilledPath = () => {
    if (graphData.length === 0) return "";

    const pointSpacing = graphWidth / (graphData.length - 1);

    let path = `M ${circlePadding} ${graphHeight - circlePadding}`;

    graphData.forEach((point, index) => {
      const x = circlePadding + index * pointSpacing;
      const y = ouncesToY(point.value);
      path += ` L ${x} ${y}`;
    });

    path += ` L ${circlePadding + graphWidth} ${graphHeight - circlePadding}`;
    path += ` Z`;

    return path;
  };

  const linePath = createLinePath();
  const filledPath = createFilledPath();
  const pointSpacing = graphWidth / (graphData.length - 1);

  // Create goal line segments - one segment for each unique goal
  const goalSegments = [];
  let currentGoal = graphData[0]?.dailyGoal || dailyGoal;
  let segmentStart = 0;

  for (let i = 1; i <= graphData.length; i++) {
    const nextGoal = graphData[i]?.dailyGoal || dailyGoal;

    // If goal changed or end of week, create segment
    if (i === graphData.length || nextGoal !== currentGoal) {
      goalSegments.push({
        startIndex: segmentStart,
        endIndex: i - 1,
        goal: currentGoal,
      });

      if (i < graphData.length) {
        currentGoal = nextGoal;
        segmentStart = i;
      }
    }
  }

  // Responsive font sizes
  const titleFontSize = isSmallDevice ? 14 : isLargeDevice ? 18 : 16;
  const yAxisFontSize = isSmallDevice ? 10 : isLargeDevice ? 12 : 11;
  const dayLabelFontSize = isSmallDevice ? 11 : isLargeDevice ? 13 : 12;
  const legendFontSize = isSmallDevice ? 12 : isLargeDevice ? 14 : 13;

  return (
    <View
      style={{
        width: containerWidth,
        paddingVertical: 24 * scale,
        paddingHorizontal: 8 * scale,
      }}
    >
      <Text
        style={{
          fontSize: titleFontSize * scale,
          fontWeight: "700",
          color: "#1E293B",
          marginBottom: 12 * scale,
          textAlign: "center",
        }}
      >
        Weekly Progress
      </Text>

      <View style={{ flexDirection: "row" }}>
        {/* Y-Axis Labels */}
        <View
          style={{
            width: yAxisWidth,
            height: graphHeight,
            justifyContent: "space-between",
            paddingRight: 8 * scale,
          }}
        >
          {yAxisTicks.map((tick, index) => (
            <Text
              key={index}
              style={{
                fontSize: yAxisFontSize * scale,
                color: "#64748B",
                fontWeight: "600",
                textAlign: "right",
              }}
            >
              {formatWaterAmount(tick, waterUnit, true)}
            </Text>
          ))}
        </View>

        {/* Graph Area */}
        <View
          style={{ width: graphWidth + circlePadding * 2, height: graphHeight }}
        >
          <Svg width={graphWidth + circlePadding * 2} height={graphHeight}>
            <Defs>
              <LinearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0EA5E9" stopOpacity="0.3" />
                <Stop offset="1" stopColor="#0EA5E9" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Draw goal line segments - one for each unique goal */}
            {goalSegments.map((segment, idx) => {
              const x1 = circlePadding + segment.startIndex * pointSpacing;
              const x2 = circlePadding + segment.endIndex * pointSpacing;
              const y = ouncesToY(segment.goal);

              return (
                <SvgLine
                  key={`goal-${idx}`}
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="6, 6"
                />
              );
            })}

            {/* Filled area under the line */}
            <Path d={filledPath} fill="url(#graphGradient)" />

            {/* Line graph */}
            <Path
              d={linePath}
              stroke="#0EA5E9"
              strokeWidth={3 * scale}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points as circles */}
            {graphData.map((point, index) => {
              const x = circlePadding + index * pointSpacing;
              const y = ouncesToY(point.value);

              return (
                <Circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={circleRadius}
                  fill="#0EA5E9"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        </View>
      </View>

      {/* Day labels below the graph */}
      <View
        style={{
          flexDirection: "row",
          marginLeft: yAxisWidth + 8 * scale,
          marginTop: 8 * scale,
          marginBottom: 12 * scale,
          width: graphWidth + circlePadding * 2,
          position: "relative",
        }}
      >
        {graphData.map((point, index) => {
          // Spread labels from M (at start) to Su (at 95% of graph width)
          const totalSpread = graphWidth * 0.95;
          const labelSpacing = totalSpread / (graphData.length - 1);
          const xPosition = circlePadding + index * labelSpacing - 8 * scale;

          return (
            <Text
              key={index}
              style={{
                position: "absolute",
                left: xPosition,
                fontSize: dayLabelFontSize * scale,
                color: "#64748B",
                fontWeight: "600",
                textAlign: "left",
              }}
            >
              {dayLabels[index]}
            </Text>
          );
        })}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 8 * scale,
          gap: 20 * scale,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 8 * scale }}
        >
          <View
            style={{
              width: 24 * scale,
              height: 3 * scale,
              backgroundColor: "#0EA5E9",
              borderRadius: 2 * scale,
            }}
          />
          <Text
            style={{
              fontSize: legendFontSize * scale,
              color: "#64748B",
              fontWeight: "600",
            }}
          >
            Your Intake
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 8 * scale }}
        >
          <View
            style={{
              width: 24 * scale,
              height: 3 * scale,
              backgroundColor: "#94A3B8",
              borderRadius: 2 * scale,
            }}
          />
          <Text
            style={{
              fontSize: legendFontSize * scale,
              color: "#64748B",
              fontWeight: "600",
            }}
          >
            Daily Goal
          </Text>
        </View>
      </View>
    </View>
  );
}
