import React from "react";
import { View, Text } from "react-native";
import Svg, { G, Path, Circle } from "react-native-svg";

export function PieChart({ segments, size, total, scale }) {
  const radius = size / 2;
  const center = radius;

  const createArc = (startAngle, endAngle, color) => {
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    const path = `
      M ${center} ${center}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      Z
    `;

    return path;
  };

  let currentAngle = -Math.PI / 2;

  return (
    <View style={{ overflow: "visible" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {segments.map((segment, index) => {
            const percentage = (segment.value / total) * 100;
            const angle = (segment.value / total) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            if (percentage >= 99.5) {
              return (
                <Circle
                  key={`segment-${index}`}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={segment.color}
                />
              );
            }

            const path = createArc(startAngle, endAngle, segment.color);

            return (
              <Path key={`segment-${index}`} d={path} fill={segment.color} />
            );
          })}
        </G>
      </Svg>

      {/* Legend */}
      <View style={{ marginTop: 16 * scale }}>
        {segments.map((segment, index) => {
          const percentage = ((segment.value / total) * 100).toFixed(0);
          return (
            <View
              key={`legend-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8 * scale,
              }}
            >
              <View
                style={{
                  width: 12 * scale,
                  height: 12 * scale,
                  backgroundColor: segment.color,
                  borderRadius: 2 * scale,
                  marginRight: 8 * scale,
                }}
              />
              <Text
                style={{
                  fontSize: 14 * scale,
                  color: "#0F172A",
                  fontWeight: "600",
                  flex: 1,
                }}
              >
                {segment.label}
              </Text>
              <Text
                style={{
                  fontSize: 14 * scale,
                  color: "#64748B",
                  fontWeight: "700",
                  marginLeft: 16 * scale,
                }}
              >
                {percentage}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
