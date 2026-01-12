import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export function HourlyCup({ hour, hourLabel, ounces, dailyGoal }) {
  const fillAnimation = useRef(new Animated.Value(0)).current;

  // Calculate fill percentage
  // Cup max = 50% of daily goal
  const cupMax = dailyGoal * 0.5;
  const rawFillPercent = ounces / cupMax;
  const fillPercent = Math.min(rawFillPercent, 1.0);

  // Cup dimensions - responsive to screen width
  // 4 cups per row with gaps
  const cupWidth = (screenWidth - 32 - 36) / 4; // 32 for horizontal padding, 36 for 3 gaps of 12
  const cupHeight = cupWidth * 1.4; // Maintain aspect ratio

  // Inner dimensions with padding
  const sidePadding = cupWidth * 0.08;
  const verticalPadding = cupHeight * 0.08;
  const innerWidth = cupWidth - sidePadding * 2;
  const innerHeight = cupHeight - verticalPadding * 2;

  // Calculate fill height
  const fillHeight = innerHeight * fillPercent;

  useEffect(() => {
    Animated.spring(fillAnimation, {
      toValue: fillPercent,
      useNativeDriver: false,
      tension: 45,
      friction: 9,
    }).start();
  }, [fillPercent]);

  // Interpolate animated fill height
  const animatedFillHeight = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, innerHeight],
  });

  // Format ounces display
  const formatOz = (oz) => {
    const num = parseFloat(oz);
    if (num === 0) return "0 oz";
    return num % 1 === 0 ? `${Math.round(num)} oz` : `${num.toFixed(1)} oz`;
  };

  return (
    <View
      style={{
        width: cupWidth,
        alignItems: "center",
      }}
    >
      {/* Cup container */}
      <View
        style={{
          width: cupWidth,
          height: cupHeight,
          backgroundColor: "rgba(224, 242, 254, 0.3)",
          borderRadius: cupWidth * 0.12,
          borderWidth: 2,
          borderColor: "#BFDBFE",
          overflow: "hidden",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingVertical: verticalPadding,
        }}
      >
        {/* Animated water fill */}
        <Animated.View
          style={{
            position: "absolute",
            bottom: verticalPadding,
            width: innerWidth,
            height: animatedFillHeight,
            backgroundColor: "#0EA5E9",
            borderRadius: cupWidth * 0.08,
          }}
        />

        {/* Text labels - positioned absolutely to stay centered */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Hour label */}
          <Text
            style={{
              fontSize: cupWidth * 0.18,
              fontWeight: "600",
              color: "#000000",
              marginBottom: 2,
            }}
          >
            {hourLabel}
          </Text>

          {/* Ounces label */}
          <Text
            style={{
              fontSize: cupWidth * 0.22,
              fontWeight: "700",
              color: "#0EA5E9",
            }}
          >
            {formatOz(ounces)}
          </Text>
        </View>

        {/* Glare effect - subtle */}
        <View
          style={{
            position: "absolute",
            top: cupHeight * 0.15,
            left: cupWidth * 0.15,
            width: cupWidth * 0.15,
            height: cupHeight * 0.25,
            backgroundColor: "rgba(255, 255, 255, 0.25)",
            borderRadius: cupWidth * 0.08,
          }}
        />
      </View>
    </View>
  );
}
