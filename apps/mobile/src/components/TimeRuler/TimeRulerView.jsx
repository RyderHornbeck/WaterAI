import { View, Text, Dimensions } from "react-native";

export function TimeRulerView({ entries = [], dailyGoal, scale = 1 }) {
  const screenWidth = Dimensions.get("window").width;
  const baseWidth = 390;
  const availableWidth = screenWidth - 48;
  const viewScale = Math.min(availableWidth / baseWidth, 1.2) * scale;

  // Base dimensions (these will all scale together)
  const baseRulerHeight = 420;
  const baseRulerLeftMargin = 70;
  const baseRulerWidth = 3;
  const baseMaxBarWidth = 180;
  const baseBarGap = 8;
  const baseTitleSize = 20;
  const baseTitleMargin = 6;
  const baseTimeSize = 14;
  const baseTickWidth = 10;
  const baseTickHeight = 2;
  const baseTickMargin = 4;
  const baseBarThickness = 4;
  const baseBarHashHeight = 10;
  const baseBarHashWidth = 2;
  const baseBottomMargin = 85;
  const baseTopMargin = 20;
  const baseOzLabelSize = 12;

  // Scaled dimensions
  const rulerHeight = baseRulerHeight * viewScale;
  const rulerLeftMargin = baseRulerLeftMargin * viewScale;
  const rulerWidth = baseRulerWidth * viewScale;
  const maxBarWidth = baseMaxBarWidth * viewScale;
  const barGap = baseBarGap * viewScale;
  const bottomMargin = baseBottomMargin * viewScale;
  const topMargin = baseTopMargin * viewScale;

  const maxOz = 50; // Fixed max oz for the scale

  // Time labels to show (every 3 hours)
  const timeLabels = [
    { hour: 0, label: "12 AM" },
    { hour: 3, label: "3 AM" },
    { hour: 6, label: "6 AM" },
    { hour: 9, label: "9 AM" },
    { hour: 12, label: "12 PM" },
    { hour: 15, label: "3 PM" },
    { hour: 18, label: "6 PM" },
    { hour: 21, label: "9 PM" },
    { hour: 23.983, label: "11:59", ampm: "PM" },
  ];

  // Calculate position from bottom based on time (0-24 hours)
  const getTimePosition = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const dayMinutes = 24 * 60;
    const percentOfDay = totalMinutes / dayMinutes;
    return rulerHeight * percentOfDay;
  };

  // Calculate bar width based on oz amount (max 50 oz)
  const getBarWidth = (ounces) => {
    const percent = Math.min(ounces / maxOz, 1);
    return maxBarWidth * percent;
  };

  // Check if entry exceeds 50 oz
  const exceedsMax = (ounces) => {
    return ounces > maxOz;
  };

  return (
    <View
      style={{
        width: screenWidth,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "relative",
          width: rulerLeftMargin + rulerWidth + maxBarWidth + 50 * viewScale,
          height:
            rulerHeight +
            bottomMargin +
            topMargin +
            baseTitleSize * viewScale +
            baseTitleMargin * viewScale +
            20 * viewScale,
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: baseTitleSize * viewScale,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: baseTitleMargin * viewScale,
            textAlign: "center",
          }}
        >
          Today's Timeline
        </Text>

        {/* Vertical Time Ruler */}
        <View
          style={{
            position: "absolute",
            left: rulerLeftMargin,
            bottom: bottomMargin,
            width: rulerWidth,
            height: rulerHeight,
            backgroundColor: "#94A3B8",
            borderRadius: 2 * viewScale,
          }}
        />

        {/* Horizontal Oz Ruler (connecting to make L-shape) */}
        <View
          style={{
            position: "absolute",
            left: rulerLeftMargin,
            bottom: bottomMargin - rulerWidth / 2,
            width: maxBarWidth + barGap,
            height: rulerWidth,
            backgroundColor: "#94A3B8",
            borderRadius: 2 * viewScale,
          }}
        />

        {/* 50 oz label at the right end of horizontal line */}
        <Text
          style={{
            position: "absolute",
            left: rulerLeftMargin + maxBarWidth + barGap + 4 * viewScale,
            bottom:
              bottomMargin - (baseOzLabelSize * viewScale) / 2 - 2 * viewScale,
            fontSize: baseOzLabelSize * viewScale,
            color: "#64748B",
            fontWeight: "600",
          }}
        >
          50 oz
        </Text>

        {/* Time Labels and Tick Marks */}
        {timeLabels.map(({ hour, label, ampm }) => {
          const position = (hour / 24) * rulerHeight;
          const isLastLabel = ampm !== undefined;
          const isProminentTime = hour === 0 || hour === 12 || hour === 23.983;
          const tickWidth =
            baseTickWidth * viewScale * (isProminentTime ? 2 : 1);

          return (
            <View
              key={hour}
              style={{
                position: "absolute",
                left: 0,
                bottom: bottomMargin + position - 10 * viewScale,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {isLastLabel ? (
                // Special layout for 11:59 PM - horizontal
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width:
                      rulerLeftMargin - baseTickMargin * viewScale - tickWidth,
                    justifyContent: "flex-end",
                  }}
                >
                  <Text
                    style={{
                      fontSize: baseTimeSize * viewScale,
                      color: "#64748B",
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: baseTimeSize * viewScale,
                      color: "#64748B",
                      fontWeight: "600",
                      marginLeft: 4 * viewScale,
                    }}
                  >
                    {ampm}
                  </Text>
                </View>
              ) : (
                // Normal layout for other times
                <Text
                  style={{
                    fontSize: baseTimeSize * viewScale,
                    color: "#64748B",
                    fontWeight: "600",
                    width:
                      rulerLeftMargin - baseTickMargin * viewScale - tickWidth,
                    textAlign: "right",
                  }}
                >
                  {label}
                </Text>
              )}
              <View
                style={{
                  width: tickWidth,
                  height:
                    baseTickHeight * viewScale * (isProminentTime ? 2 : 1),
                  backgroundColor: "#94A3B8",
                  marginLeft: baseTickMargin * viewScale,
                  borderRadius: 1 * viewScale,
                }}
              />
            </View>
          );
        })}

        {/* Water Entries as Horizontal Bars */}
        {entries.map((entry, index) => {
          const position = getTimePosition(entry.timestamp);
          const barWidth = getBarWidth(entry.ounces);
          const hasOverflow = exceedsMax(entry.ounces);
          const displayWidth = hasOverflow ? maxBarWidth : barWidth;

          return (
            <View
              key={entry.id || index}
              style={{
                position: "absolute",
                left: rulerLeftMargin + rulerWidth + barGap,
                bottom: bottomMargin + position - 2 * viewScale,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {/* Bar */}
              <View
                style={{
                  width: displayWidth,
                  height: baseBarThickness * viewScale,
                  backgroundColor: "#0EA5E9",
                  borderRadius: 2 * viewScale,
                  shadowColor: "#0EA5E9",
                  shadowOffset: { width: 0, height: 1 * viewScale },
                  shadowOpacity: 0.3,
                  shadowRadius: 2 * viewScale,
                }}
              />
              {/* Small vertical hash mark at the end */}
              <View
                style={{
                  width: baseBarHashWidth * viewScale,
                  height: baseBarHashHeight * viewScale,
                  backgroundColor: "#0EA5E9",
                  borderRadius: 1 * viewScale,
                }}
              />
              {/* Plus indicator for overflow */}
              {hasOverflow && (
                <Text
                  style={{
                    fontSize: baseTimeSize * viewScale,
                    color: "#0EA5E9",
                    fontWeight: "700",
                    marginLeft: 4 * viewScale,
                  }}
                >
                  +
                </Text>
              )}
            </View>
          );
        })}

        {/* Empty state message */}
        {entries.length === 0 && (
          <View
            style={{
              position: "absolute",
              left: rulerLeftMargin + rulerWidth + barGap,
              top: "50%",
              transform: [{ translateY: -20 * viewScale }],
            }}
          >
            <Text
              style={{
                fontSize: baseTimeSize * viewScale,
                color: "#94A3B8",
                fontStyle: "italic",
              }}
            >
              No water entries yet today
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
