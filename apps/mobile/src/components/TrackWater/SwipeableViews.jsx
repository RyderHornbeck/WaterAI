import { View, ScrollView, Dimensions, Text } from "react-native";
import { WaterBottle } from "@/components/WaterBottle/WaterBottle";
import { HumanSilhouette } from "@/components/HumanSilhouette/HumanSilhouette";
import { PageIndicator } from "@/components/Analytics/PageIndicator";

export function SwipeableViews({
  horizontalScrollRef,
  onPageChange,
  currentPage,
  fillAnimation,
  wave1X,
  wave2X,
  wave3X,
  todayTotal,
  dailyGoal,
  progress,
  entries,
  onBottlePress,
  scale,
}) {
  const screenWidth = Dimensions.get("window").width;

  // Generate 24 hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHourLabel = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  // Process entries into hourly data
  const processEntriesIntoHours = () => {
    const hourlyTotals = Array(24).fill(0);
    entries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      const hour = entryDate.getHours();
      hourlyTotals[hour] += parseFloat(entry.ounces) || 0;
    });
    return hourlyTotals;
  };

  const hourlyData = processEntriesIntoHours();

  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / screenWidth);
          onPageChange(page);
        }}
        scrollEventThrottle={16}
        style={{ height: 540 * scale }}
      >
        {/* Page 1: Bottle View */}
        <View style={{ width: screenWidth, alignItems: "center" }}>
          <WaterBottle
            fillAnimation={fillAnimation}
            wave1X={wave1X}
            wave2X={wave2X}
            wave3X={wave3X}
            todayTotal={todayTotal}
            dailyGoal={dailyGoal}
            progress={progress}
            entries={entries}
            onPress={onBottlePress}
          />
        </View>

        {/* Page 2: Circular Progress Ring */}
        <View
          style={{
            width: screenWidth,
            paddingHorizontal: 16,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <HumanSilhouette
            progress={progress}
            todayTotal={todayTotal}
            dailyGoal={dailyGoal}
            entries={entries}
          />
        </View>
      </ScrollView>

      {/* Page Indicator Dots */}
      <PageIndicator currentPage={currentPage} totalPages={2} scale={scale} />
    </View>
  );
}
