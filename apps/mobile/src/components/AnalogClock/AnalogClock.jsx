import {
  View,
  Text,
  Animated,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Svg, { Circle, Line, G, Path } from "react-native-svg";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedG = Animated.createAnimatedComponent(G);

export function AnalogClock({ size = 320, entries = [], dailyGoal = 64 }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedQuadrant, setSelectedQuadrant] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  // Initialize with current time's AM/PM
  const [viewPeriod, setViewPeriod] = useState(
    new Date().getHours() >= 12 ? "PM" : "AM",
  );
  const insets = useSafeAreaInsets();

  const hourRotation = useRef(new Animated.Value(0)).current;
  const minuteRotation = useRef(new Animated.Value(0)).current;

  // Get screen dimensions and calculate scale factor
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const scale = Math.min(screenWidth / 390, 1.2);

  // Scale the clock size based on screen
  const scaledSize = size * scale;

  // 12 lighter shades of blue
  const blueShades = [
    "#7DD3FC", // 12 o'clock - sky blue
    "#67C7F7",
    "#5BBEF3",
    "#4FB5EF",
    "#43ACEB",
    "#38A3E7",
    "#2C9AE3",
    "#2091DF",
    "#1488DB",
    "#0E7FD7",
    "#0876D3",
    "#0369A1", // 11 o'clock - darker but still lighter than before
  ];

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();

    // Calculate rotation angles
    const hourAngle = hours * 30 + minutes * 0.5;
    const minuteAngle = minutes * 6 + seconds * 0.1;

    Animated.parallel([
      Animated.timing(hourRotation, {
        toValue: hourAngle,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(minuteRotation, {
        toValue: minuteAngle,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentTime]);

  const center = scaledSize / 2;
  const clockRadius = (scaledSize - 40 * scale) / 2;
  const borderWidth = 3 * scale;

  // Hand dimensions
  const hourHandLength = clockRadius * 0.5;
  const hourHandWidth = 6 * scale;
  const minuteHandLength = clockRadius * 0.75;
  const minuteHandWidth = 4 * scale;

  // Calculate hourly water intake for both AM and PM
  const calculateHourlyIntake = () => {
    const amData = Array(12).fill(0);
    const pmData = Array(12).fill(0);
    const amEntries = Array(12)
      .fill(null)
      .map(() => []);
    const pmEntries = Array(12)
      .fill(null)
      .map(() => []);

    if (!entries || entries.length === 0) {
      return { amData, pmData, amEntries, pmEntries };
    }

    entries.forEach((entry) => {
      const timestamp = new Date(entry.timestamp);
      const hour24 = timestamp.getHours();
      const hour12 = hour24 % 12;
      const ounces = parseFloat(entry.ounces) || 0;

      if (hour24 < 12) {
        // AM
        amData[hour12] += ounces;
        amEntries[hour12].push(entry);
      } else {
        // PM
        pmData[hour12] += ounces;
        pmEntries[hour12].push(entry);
      }
    });

    return { amData, pmData, amEntries, pmEntries };
  };

  const { amData, pmData, amEntries, pmEntries } = calculateHourlyIntake();

  // Get current period data based on toggle
  const currentData = viewPeriod === "AM" ? amData : pmData;
  const currentEntries = viewPeriod === "AM" ? amEntries : pmEntries;

  // Create a wedge path for filling
  const createWedgePath = (hourPosition, fillAmount) => {
    const halfGoal = dailyGoal / 2;
    const fillRatio = Math.min(fillAmount / halfGoal, 1);

    const outerRadius = clockRadius - borderWidth - 2 * scale;
    const innerRadius = outerRadius * (1 - fillRatio);

    const startAngle = (hourPosition * 30 - 90) * (Math.PI / 180);
    const endAngle = ((hourPosition + 1) * 30 - 90) * (Math.PI / 180);

    const outerStartX = center + Math.cos(startAngle) * outerRadius;
    const outerStartY = center + Math.sin(startAngle) * outerRadius;
    const outerEndX = center + Math.cos(endAngle) * outerRadius;
    const outerEndY = center + Math.sin(endAngle) * outerRadius;

    const innerStartX = center + Math.cos(startAngle) * innerRadius;
    const innerStartY = center + Math.sin(startAngle) * innerRadius;
    const innerEndX = center + Math.cos(endAngle) * innerRadius;
    const innerEndY = center + Math.sin(endAngle) * innerRadius;

    const path = `
      M ${outerStartX} ${outerStartY}
      A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndX} ${outerEndY}
      L ${innerEndX} ${innerEndY}
      A ${innerRadius} ${innerRadius} 0 0 0 ${innerStartX} ${innerStartY}
      Z
    `;

    return path;
  };

  // Helper to get wedge center point for Pressable positioning
  const getWedgeCenter = (hourPosition) => {
    const middleAngle = (hourPosition * 30 + 15 - 90) * (Math.PI / 180);
    const radius = clockRadius * 0.65; // Position at ~65% of radius
    const x = center + Math.cos(middleAngle) * radius;
    const y = center + Math.sin(middleAngle) * radius;
    return { x, y };
  };

  // Render hourly water quadrants
  const renderHourlyQuadrants = () => {
    return Array.from({ length: 12 }).map((_, hourPosition) => {
      const amount = currentData[hourPosition];

      const path = createWedgePath(hourPosition, amount);
      const color = blueShades[hourPosition];
      const opacity = amount > 0 ? 1.0 : 0.15;

      return (
        <Path
          key={`wedge-${hourPosition}`}
          d={path}
          fill={color}
          opacity={opacity}
        />
      );
    });
  };

  // Render pressable overlay zones for each wedge
  const renderPressableZones = () => {
    return Array.from({ length: 12 }).map((_, hourPosition) => {
      const { x, y } = getWedgeCenter(hourPosition);
      const touchSize = clockRadius * 0.5; // Large touch target

      return (
        <Pressable
          key={`pressable-${hourPosition}`}
          style={{
            position: "absolute",
            left: x - touchSize / 2,
            top: y - touchSize / 2,
            width: touchSize,
            height: touchSize,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => {
            setSelectedQuadrant(hourPosition);
            setSelectedPeriod(viewPeriod);
          }}
        >
          {/* Invisible touch target */}
        </Pressable>
      );
    });
  };

  // Hour markers
  const renderHourMarkers = () => {
    const markers = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const isMainHour = i % 3 === 0;

      const outerRadius = clockRadius - 10 * scale;
      const innerRadius = outerRadius - (isMainHour ? 15 * scale : 8 * scale);

      const x1 = center + Math.cos(angle) * outerRadius;
      const y1 = center + Math.sin(angle) * outerRadius;
      const x2 = center + Math.cos(angle) * innerRadius;
      const y2 = center + Math.sin(angle) * innerRadius;

      markers.push(
        <Line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#1E293B"
          strokeWidth={isMainHour ? 3 * scale : 2 * scale}
          strokeLinecap="round"
        />,
      );
    }
    return markers;
  };

  // Format time for display
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

  // Get hour label (e.g., "12", "1", "2", etc.)
  const getHourLabel = (hourPosition) => {
    return hourPosition === 0 ? "12" : hourPosition.toString();
  };

  // Get full hour display (e.g., "1 PM", "12 AM")
  const getFullHourDisplay = (hourPosition, period) => {
    const hourLabel = getHourLabel(hourPosition);
    return `${hourLabel} ${period}`;
  };

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 20 * scale,
      }}
    >
      {/* AM/PM Toggle - Centered above clock */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#F0F9FF",
          borderRadius: 12 * scale,
          padding: 4 * scale,
          marginBottom: 20 * scale,
        }}
      >
        <TouchableOpacity
          onPress={() => setViewPeriod("AM")}
          style={{
            paddingHorizontal: 16 * scale,
            paddingVertical: 8 * scale,
            borderRadius: 8 * scale,
            backgroundColor: viewPeriod === "AM" ? "#0EA5E9" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14 * scale,
              fontWeight: "700",
              color: viewPeriod === "AM" ? "#FFFFFF" : "#64748B",
            }}
          >
            AM
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewPeriod("PM")}
          style={{
            paddingHorizontal: 16 * scale,
            paddingVertical: 8 * scale,
            borderRadius: 8 * scale,
            backgroundColor: viewPeriod === "PM" ? "#0EA5E9" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14 * scale,
              fontWeight: "700",
              color: viewPeriod === "PM" ? "#FFFFFF" : "#64748B",
            }}
          >
            PM
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          width: scaledSize,
          height: scaledSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={scaledSize} height={scaledSize}>
          {/* Clock face background */}
          <Circle cx={center} cy={center} r={clockRadius} fill="#FFFFFF" />

          {/* Hourly water quadrants */}
          <G>{renderHourlyQuadrants()}</G>

          {/* Clock border */}
          <Circle
            cx={center}
            cy={center}
            r={clockRadius}
            fill="none"
            stroke="#0EA5E9"
            strokeWidth={borderWidth}
          />

          {/* Hour markers - renders on top of slices */}
          <G>{renderHourMarkers()}</G>

          {/* Minute hand */}
          <AnimatedG origin={`${center}, ${center}`} rotation={minuteRotation}>
            <Line
              x1={center}
              y1={center}
              x2={center}
              y2={center - minuteHandLength}
              stroke="#1E293B"
              strokeWidth={minuteHandWidth}
              strokeLinecap="round"
            />
          </AnimatedG>

          {/* Hour hand */}
          <AnimatedG origin={`${center}, ${center}`} rotation={hourRotation}>
            <Line
              x1={center}
              y1={center}
              x2={center}
              y2={center - hourHandLength}
              stroke="#1E293B"
              strokeWidth={hourHandWidth}
              strokeLinecap="round"
            />
          </AnimatedG>

          {/* Center dot */}
          <Circle cx={center} cy={center} r={8 * scale} fill="#0EA5E9" />
          <Circle cx={center} cy={center} r={4 * scale} fill="#FFFFFF" />
        </Svg>

        {/* Pressable zones overlay */}
        {renderPressableZones()}
      </View>

      {/* Digital time display below clock */}
      <View
        style={{
          marginTop: 16 * scale,
          backgroundColor: "#F0F9FF",
          paddingHorizontal: 20 * scale,
          paddingVertical: 10 * scale,
          borderRadius: 16 * scale,
        }}
      >
        <Text
          style={{
            fontSize: 16 * scale,
            fontWeight: "700",
            color: "#0EA5E9",
            letterSpacing: 1,
          }}
        >
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {/* Quadrant Details Modal */}
      <Modal
        visible={selectedQuadrant !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedQuadrant(null);
          setSelectedPeriod(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <Pressable
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={() => {
              setSelectedQuadrant(null);
              setSelectedPeriod(null);
            }}
          />
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24 * scale,
              borderTopRightRadius: 24 * scale,
              paddingTop: 20 * scale,
              paddingBottom: insets.bottom + 20 * scale,
              height: screenHeight * 0.92,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24 * scale,
                paddingBottom: 16 * scale,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 24 * scale,
                  fontWeight: "700",
                  color: "#1E293B",
                }}
              >
                {selectedQuadrant !== null && selectedPeriod
                  ? getFullHourDisplay(selectedQuadrant, selectedPeriod)
                  : ""}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedQuadrant(null);
                  setSelectedPeriod(null);
                }}
              >
                <X size={24 * scale} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 24 * scale }}
              showsVerticalScrollIndicator={false}
            >
              {selectedQuadrant !== null && selectedPeriod && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12 * scale,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18 * scale,
                        fontWeight: "700",
                        color: "#0EA5E9",
                      }}
                    >
                      Total
                    </Text>
                    <Text
                      style={{
                        fontSize: 16 * scale,
                        fontWeight: "600",
                        color: "#0EA5E9",
                      }}
                    >
                      {(selectedPeriod === "AM"
                        ? amData[selectedQuadrant]
                        : pmData[selectedQuadrant]
                      ).toFixed(1)}{" "}
                      oz
                    </Text>
                  </View>

                  {(selectedPeriod === "AM"
                    ? amEntries[selectedQuadrant]
                    : pmEntries[selectedQuadrant]
                  ).length > 0 ? (
                    (selectedPeriod === "AM"
                      ? amEntries[selectedQuadrant]
                      : pmEntries[selectedQuadrant]
                    ).map((entry, idx) => (
                      <View
                        key={`entry-${idx}`}
                        style={{
                          backgroundColor: "#F0F9FF",
                          padding: 12 * scale,
                          borderRadius: 12 * scale,
                          marginBottom: 8 * scale,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14 * scale,
                              color: "#64748B",
                              fontWeight: "600",
                            }}
                          >
                            {formatTime(entry.timestamp)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 16 * scale,
                              fontWeight: "700",
                              color: "#0EA5E9",
                            }}
                          >
                            {parseFloat(entry.ounces).toFixed(1)} oz
                          </Text>
                        </View>
                        {entry.description && (
                          <Text
                            style={{
                              fontSize: 12 * scale,
                              color: "#94A3B8",
                              marginTop: 4 * scale,
                            }}
                          >
                            {entry.description}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text
                      style={{
                        fontSize: 14 * scale,
                        color: "#94A3B8",
                        fontStyle: "italic",
                      }}
                    >
                      No entries for this hour
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
