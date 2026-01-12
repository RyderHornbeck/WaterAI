import {
  View,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function WaterBottle({
  fillAnimation,
  wave1X,
  wave2X,
  wave3X,
  todayTotal,
  dailyGoal,
  progress,
  entries = [],
  onPress,
}) {
  const [displayTotal, setDisplayTotal] = useState(todayTotal);
  const prevTotalRef = useRef(todayTotal);
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  // Calculate when the user reached their daily goal
  const getGoalCompletionTime = () => {
    if (!entries || entries.length === 0 || todayTotal < dailyGoal) {
      return null;
    }

    // Sort entries by timestamp (oldest first)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    let runningTotal = 0;
    for (const entry of sortedEntries) {
      runningTotal += parseFloat(entry.ounces);
      if (runningTotal >= dailyGoal) {
        return entry.timestamp;
      }
    }

    return null;
  };

  const goalCompletionTime = getGoalCompletionTime();

  // Get screen dimensions and calculate scale factor
  const screenWidth = Dimensions.get("window").width;
  // Base design width is 390px (iPhone 14 Pro width)
  // Total width needed: bottle + space for tick marks on both sides
  const baseWidth = 390;
  const availableWidth = screenWidth - 48; // 24px padding on each side
  const scale = Math.min(availableWidth / baseWidth, 1.2); // Cap at 1.2x for larger devices

  // Scaled dimensions
  const bottleWidth = 240 * scale;
  const bottleHeight = 360 * scale;
  const bottleContainerHeight = 400 * scale;
  const capWidth = 80 * scale;
  const capHeight = 28 * scale;
  const neckHeight = 45 * scale;
  const neckTop = capHeight;
  const bodyTop = capHeight + neckHeight;

  // Tick mark dimensions
  const tickMarkWidth = 16 * scale;
  const tickMarkHeight = 2.5 * scale;
  const ozLabelWidth = 40 * scale;
  const ozLabelFontSize = 13 * scale;
  const timeLabelFontSize = 12 * scale;

  // Horizontal positioning
  const tickGapFromBottle = 8 * scale; // Gap between tick mark and bottle edge
  const containerWidth = bottleWidth + 150 * scale; // Extra space for tick marks on both sides
  const bottleLeftEdge = (containerWidth - bottleWidth) / 2; // Bottle is centered in container
  const bottleRightEdge = bottleLeftEdge + bottleWidth;

  // Left tick marks (oz) - positioned to the left of bottle
  const leftTickRight = bottleLeftEdge - tickGapFromBottle; // Right edge of left tick marks
  const leftTickLeft = leftTickRight - tickMarkWidth; // Left edge of left tick marks
  const leftLabelRight = leftTickLeft - 4 * scale; // Right edge of oz labels

  // Right tick marks (time) - positioned to the right of bottle
  const rightTickLeft = bottleRightEdge + tickGapFromBottle; // Left edge of right tick marks

  // Animate the counter when todayTotal changes
  useEffect(() => {
    const prevTotal = prevTotalRef.current;
    const newTotal = todayTotal;

    if (prevTotal === newTotal) return;

    const difference = newTotal - prevTotal;
    const duration = 750;

    // Calculate appropriate step size based on display unit and amount being added
    let stepSize;
    if (waterUnit === "liters") {
      // For liters, use 0.01L steps (0.338 oz per step)
      stepSize = 0.01 / 0.0295735; // 0.01L converted to oz
    } else if (waterUnit === "ml") {
      // For ml, use 10ml steps (0.338 oz per step)
      stepSize = 10 / 29.5735; // 10ml converted to oz
    } else {
      // For oz, use 1 oz steps
      stepSize = 1;
    }

    const steps = Math.ceil(Math.abs(difference) / stepSize);
    const actualStepSize = difference / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      setDisplayTotal(prevTotal + currentStep * actualStepSize);

      if (currentStep >= steps) {
        clearInterval(interval);
        setDisplayTotal(newTotal);
        prevTotalRef.current = newTotal;
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [todayTotal, waterUnit]);

  // Calculate tick mark positions based on bottle geometry
  const getTickPosition = (percent) => {
    // The drawable area of the bottle (where water fills)
    const drawableHeight = bottleHeight - 12 * scale; // Account for top/bottom padding
    // Position from the top of the drawable area
    const positionFromDrawableTop = ((100 - percent) / 100) * drawableHeight;
    // Move tick marks up by 2% of the bottle height for better visibility
    const upwardOffset = bottleHeight * 0.02;
    // Absolute position from container top
    const absoluteTop =
      bodyTop + 6 * scale + positionFromDrawableTop - upwardOffset;
    return absoluteTop;
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <View
      style={{
        marginHorizontal: 0,
      }}
    >
      <View style={{ alignItems: "center" }}>
        {/* Bottle Container - Now Tappable */}
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={{
            position: "relative",
            width: containerWidth,
            height: bottleContainerHeight,
            marginBottom: 24 * scale,
            alignItems: "center",
          }}
        >
          {/* Bottle Cap/Lid */}
          <View
            style={{
              position: "absolute",
              top: 0,
              width: capWidth,
              height: capHeight,
              backgroundColor: "#0EA5E9",
              borderRadius: 8 * scale,
              borderTopLeftRadius: 10 * scale,
              borderTopRightRadius: 10 * scale,
              zIndex: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 * scale },
              shadowOpacity: 0.15,
              shadowRadius: 3 * scale,
            }}
          >
            {/* Cap top ridge */}
            <View
              style={{
                position: "absolute",
                top: 6 * scale,
                left: 12 * scale,
                right: 12 * scale,
                height: 3 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: 2 * scale,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 12 * scale,
                left: 12 * scale,
                right: 12 * scale,
                height: 3 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: 2 * scale,
              }}
            />
          </View>

          {/* Bottle Neck */}
          <View
            style={{
              position: "absolute",
              top: neckTop,
              width: capWidth,
              height: neckHeight,
              backgroundColor: "rgba(224, 242, 254, 0.4)",
              borderLeftWidth: 4 * scale,
              borderRightWidth: 4 * scale,
              borderColor: "#BFDBFE",
              overflow: "hidden",
            }}
          >
            {/* Neck shine */}
            <View
              style={{
                position: "absolute",
                left: 8 * scale,
                top: 0,
                bottom: 0,
                width: 20 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.25)",
              }}
            />
          </View>

          {/* Main Bottle Body */}
          <View
            style={{
              position: "absolute",
              top: bodyTop,
              width: bottleWidth,
              height: bottleHeight,
              backgroundColor: "rgba(224, 242, 254, 0.3)",
              borderRadius: 28 * scale,
              borderTopLeftRadius: 32 * scale,
              borderTopRightRadius: 32 * scale,
              borderBottomLeftRadius: 32 * scale,
              borderBottomRightRadius: 32 * scale,
              borderWidth: 6 * scale,
              borderColor: "#BFDBFE",
              overflow: "hidden",
            }}
          >
            {/* Water Fill - Uniform Blue with padding to avoid edges */}
            <Animated.View
              style={{
                position: "absolute",
                bottom: 6 * scale,
                left: 6 * scale,
                right: 6 * scale,
                height: fillAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (bottleHeight - 12 * scale) * 0.99],
                  extrapolate: "clamp",
                }),
                backgroundColor: "#0EA5E9",
                borderRadius: 20 * scale,
                borderBottomLeftRadius: 26 * scale,
                borderBottomRightRadius: 26 * scale,
              }}
            />

            {/* Bottle shine/gloss effect */}
            <View
              style={{
                position: "absolute",
                top: 30 * scale,
                left: 25 * scale,
                width: 50 * scale,
                height: 150 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.35)",
                borderRadius: 25 * scale,
              }}
            />

            {/* Secondary shine */}
            <View
              style={{
                position: "absolute",
                top: 180 * scale,
                right: 28 * scale,
                width: 40 * scale,
                height: 100 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: 20 * scale,
              }}
            />

            {/* Bottom reflection */}
            <View
              style={{
                position: "absolute",
                bottom: 20 * scale,
                left: 30 * scale,
                right: 30 * scale,
                height: 70 * scale,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: 25 * scale,
              }}
            />
          </View>

          {/* Measurement Tick Marks - Left side only */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const tickTop = getTickPosition(percent);
            const ozAmount = Math.round((dailyGoal * percent) / 100);

            return (
              <View
                key={percent}
                style={{
                  position: "absolute",
                  top: tickTop - tickMarkHeight / 2,
                  left: 0,
                  flexDirection: "row",
                  alignItems: "center",
                  zIndex: 5,
                  width: leftTickRight,
                  justifyContent: "flex-end",
                }}
              >
                <Text
                  style={{
                    fontSize: ozLabelFontSize,
                    color: "#000",
                    fontWeight: "700",
                    marginRight: 4 * scale,
                    textAlign: "right",
                  }}
                >
                  {formatWaterAmount(ozAmount, waterUnit)}
                </Text>
                <View
                  style={{
                    width: tickMarkWidth,
                    height: tickMarkHeight,
                    backgroundColor: "#000",
                    borderRadius: 2 * scale,
                  }}
                />
              </View>
            );
          })}

          {/* Goal Completion Time - Right side at 100% mark */}
          {goalCompletionTime && (
            <View
              style={{
                position: "absolute",
                top: getTickPosition(100) - timeLabelFontSize / 2,
                left: rightTickLeft,
                flexDirection: "row",
                alignItems: "center",
                zIndex: 5,
              }}
            >
              <Text
                style={{
                  fontSize: timeLabelFontSize,
                  color: "#0EA5E9",
                  fontWeight: "700",
                }}
              >
                {formatTime(goalCompletionTime)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={{ alignItems: "center", marginTop: 8 * scale }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              marginBottom: 12 * scale,
            }}
          >
            <Text
              style={{
                fontSize: 56 * scale,
                fontWeight: "800",
                color: "#0EA5E9",
                letterSpacing: -2 * scale,
              }}
            >
              {formatWaterAmount(displayTotal, waterUnit)}
            </Text>
            <Text
              style={{
                fontSize: 20 * scale,
                color: "#94A3B8",
                marginLeft: 8 * scale,
                fontWeight: "600",
              }}
            >
              / {formatWaterAmount(dailyGoal, waterUnit)}{" "}
              {getUnitLabel(waterUnit)}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#F0F9FF",
              paddingHorizontal: 20 * scale,
              paddingVertical: 10 * scale,
              borderRadius: 16 * scale,
            }}
          >
            <Text
              style={{
                fontSize: 15 * scale,
                fontWeight: "700",
                color: "#0EA5E9",
                letterSpacing: 0.5 * scale,
              }}
            >
              {Math.min(Math.round(progress), 100)}% COMPLETE
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
