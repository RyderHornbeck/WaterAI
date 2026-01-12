import React from "react";
import Svg, { Circle } from "react-native-svg";

export function CircularProgress({ progress, size, scale = 1 }) {
  const strokeWidth = 3 * scale;
  // Ensure radius accounts for stroke width to prevent clipping
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Svg
      width={size}
      height={size}
      style={{ position: "absolute", overflow: "visible" }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#3B82F6"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
        strokeLinecap="round"
      />
    </Svg>
  );
}
