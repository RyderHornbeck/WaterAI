import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  useWaterHistory,
  useDayDetails as useWaterDayDetails,
} from "@/hooks/useWaterEntries";
import { useMonthNavigation } from "@/hooks/useMonthNavigation";
import { useWeekNavigation } from "@/hooks/useWeekNavigation";
import { usePageScroll } from "@/hooks/usePageScroll";
import { useWeeklyGoal } from "@/hooks/useWeeklyGoal";
import {
  getDaysInMonth,
  getWeekDates,
  formatWeekRange,
  formatDayLabel,
} from "@/utils/dateHelpers";
import {
  getProgressForDate,
  getOuncesForDate,
  getGraphData,
  getDailyGoalsMap,
  getGoalForDate,
} from "@/utils/analyticsHelpers";
import { MonthNavigator } from "@/components/Analytics/MonthNavigator";
import { MonthlyCalendar } from "@/components/Analytics/MonthlyCalendar";
import { WeekNavigator } from "@/components/Analytics/WeekNavigator";
import { WeeklyCupsView } from "@/components/Analytics/WeeklyCupsView";
import { WeeklyGraphView } from "@/components/Analytics/WeeklyGraphView";
import { PageIndicator } from "@/components/Analytics/PageIndicator";
import { TodayEntriesSheet } from "@/components/TodayEntriesSheet/TodayEntriesSheet";
import { WeeklySummary } from "@/components/WeeklySummary/WeeklySummary";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export default function Analytics() {
  const insets = useSafeAreaInsets();

  const [shouldFetchHistory, setShouldFetchHistory] = useState(true);

  // Use React Query hooks for water data
  const {
    data: historyData,
    isLoading: loading,
    refetch: refetchHistory,
  } = useWaterHistory(shouldFetchHistory);

  // ✅ Extract history, goalRanges, and defaultGoal from the response
  const history = historyData?.history || [];
  const goalRanges = historyData?.goalRanges || [];
  const historyDefaultGoal = historyData?.defaultGoal || 64;

  const {
    dailyGoal: fallbackGoal,
    getCurrentDate,
    timeOffsetDays,
  } = useUserSettingsStore();

  const { currentMonth, slideAnimMonth, navigateMonth } = useMonthNavigation();
  const { selectedWeekStart, slideAnim, navigateWeek } = useWeekNavigation();

  // ✅ Fetch goal for the selected week
  const { data: weeklyGoalData } = useWeeklyGoal(selectedWeekStart);
  const dailyGoal = weeklyGoalData?.weeklyGoal || fallbackGoal;

  const [selectedDay, setSelectedDay] = useState(null);
  const [weeklySummaryVisible, setWeeklySummaryVisible] = useState(false);

  // Get day details when a day is selected - use LOCAL date format
  const selectedDayString = React.useMemo(() => {
    if (!selectedDay) return "";
    const year = selectedDay.getFullYear();
    const month = String(selectedDay.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDay.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [selectedDay]);

  const {
    data: dayDetailsData,
    isLoading: loadingDetails,
    refetch: refetchDayDetails,
  } = useWaterDayDetails(selectedDayString || "", {
    enabled: !!selectedDay, // Only fetch when a day is selected
  });

  const dayDetails = dayDetailsData?.entries || [];
  const isHistorical = dayDetailsData?.isHistorical || false;
  const historicalMessage = dayDetailsData?.message;

  const handleDayPress = (date) => {
    setSelectedDay(date);
  };

  const handleCloseDetail = () => {
    setSelectedDay(null);
  };

  const refetchCurrentDay = () => {
    if (selectedDay) {
      refetchDayDetails();
    }
  };

  const screenWidth = Dimensions.get("window").width;
  const scale = Math.min(screenWidth / 390, 1.2);
  const { currentPage, handleScroll } = usePageScroll(screenWidth, scale);
  const scrollViewRef = useRef(null);

  // Track previous offset to detect changes
  const [prevOffset, setPrevOffset] = useState(timeOffsetDays);

  // Watch for time offset changes and refetch
  useEffect(() => {
    if (prevOffset !== timeOffsetDays) {
      console.log("⏰ Time offset changed - refetching history");
      refetchHistory(); // React Query refetch
      setPrevOffset(timeOffsetDays);
    }
  }, [timeOffsetDays, refetchHistory, prevOffset]);

  // When page comes into focus, refetch in BACKGROUND
  useFocusEffect(
    React.useCallback(() => {
      console.log("📍 History page focused - refetching data");
      // Refetch in background - no loading screen
      refetchHistory();
    }, [refetchHistory]),
  );

  // Check if we should show the weekly summary button
  const shouldShowWeeklySummary = () => {
    const today = getCurrentDate();
    today.setHours(0, 0, 0, 0);

    const weekEnd = new Date(selectedWeekStart);
    weekEnd.setDate(selectedWeekStart.getDate() + 6); // Sunday of selected week
    weekEnd.setHours(23, 59, 59, 999);

    // If the selected week is in the past, always show
    if (weekEnd < today) {
      return { show: true, isSunday: false };
    }

    // If selected week is current week
    const weekStart = new Date(selectedWeekStart);
    weekStart.setHours(0, 0, 0, 0);

    if (today >= weekStart && today <= weekEnd) {
      // Current week - only show on Sunday (day 0)
      const dayOfWeek = today.getDay();
      return { show: dayOfWeek === 0, isSunday: true };
    }

    // Future week - don't show
    return { show: false, isSunday: false };
  };

  const { show: showWeeklySummary, isSunday: isCurrentSunday } =
    shouldShowWeeklySummary();

  // Show loading screen ONLY on initial load (when history is empty)
  if (loading && history.length === 0) {
    return (
      <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text
            style={{
              fontSize: 16,
              color: "#64748B",
              marginTop: 16,
              fontWeight: "600",
            }}
          >
            Loading History...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const monthDays = getDaysInMonth(currentMonth);
  const weekDates = getWeekDates(selectedWeekStart);
  const cellSize = (screenWidth - 48 * scale) / 7;
  const graphData = getGraphData(weekDates, history, dailyGoal, goalRanges);
  const containerWidth = screenWidth - 48 * scale;
  const graphKey = selectedWeekStart.toISOString();

  // Create a map of date -> goal for the selected week
  const weeklyGoalsMap = getDailyGoalsMap(
    weekDates,
    history,
    dailyGoal,
    goalRanges,
  );

  // Create a map of date -> goal for the current month (for calendar)
  const monthlyGoalsMap = getDailyGoalsMap(
    monthDays.filter((d) => d !== null),
    history,
    dailyGoal,
    goalRanges,
  );

  // Get the historical goal for the selected day
  const selectedDayGoal = selectedDay
    ? getGoalForDate(selectedDay, history, dailyGoal, goalRanges)
    : dailyGoal;

  return (
    <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20 * scale,
          paddingBottom: insets.bottom + 20 * scale,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 24 * scale, marginBottom: 24 * scale }}
        >
          <Text
            style={{
              fontSize: 32 * scale,
              fontWeight: "bold",
              color: "#1E293B",
              marginBottom: 8 * scale,
            }}
          >
            Analytics
          </Text>
          <Text style={{ fontSize: 16 * scale, color: "#64748B" }}>
            Track your hydration journey
          </Text>
        </View>

        {/* Monthly Overview */}
        <View
          style={{ paddingHorizontal: 24 * scale, marginBottom: 32 * scale }}
        >
          <MonthNavigator
            currentMonth={currentMonth}
            onNavigate={navigateMonth}
            scale={scale}
          />
          <MonthlyCalendar
            monthDays={monthDays}
            getProgressForDate={(date) =>
              getProgressForDate(date, history, dailyGoal, goalRanges)
            }
            cellSize={cellSize}
            scale={scale}
            slideAnimMonth={slideAnimMonth}
            dailyGoals={monthlyGoalsMap}
          />
        </View>

        {/* Weekly Detail View with bordered container and paging */}
        <View
          style={{
            paddingTop: 24 * scale,
            paddingHorizontal: 24 * scale,
            paddingBottom: 32 * scale,
          }}
        >
          <WeekNavigator
            selectedWeekStart={selectedWeekStart}
            onNavigate={navigateWeek}
            formatWeekRange={formatWeekRange}
            scale={scale}
          />

          {/* Bordered Container with Paging */}
          <View
            style={{
              borderWidth: 2 * scale,
              borderColor: "#BFDBFE",
              borderRadius: 20 * scale,
              overflow: "hidden",
              backgroundColor: "transparent",
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={{ width: containerWidth }}
            >
              <WeeklyCupsView
                weekDates={weekDates}
                getOuncesForDate={(date) => getOuncesForDate(date, history)}
                dailyGoal={dailyGoal}
                formatDayLabel={formatDayLabel}
                handleDayPress={handleDayPress}
                slideAnim={slideAnim}
                containerWidth={containerWidth}
                scale={scale}
                dailyGoals={weeklyGoalsMap}
              />
              <WeeklyGraphView
                graphData={graphData}
                dailyGoal={dailyGoal}
                containerWidth={containerWidth}
                scale={scale}
                graphKey={graphKey}
              />
            </ScrollView>
            <PageIndicator currentPage={currentPage} scale={scale} />
          </View>

          {/* Weekly Summary Button */}
          {showWeeklySummary && (
            <TouchableOpacity
              onPress={() => setWeeklySummaryVisible(true)}
              style={{
                marginTop: 16 * scale,
                backgroundColor: "#0EA5E9",
                paddingVertical: 12 * scale,
                paddingHorizontal: 24 * scale,
                borderRadius: 12 * scale,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 16 * scale,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                Weekly Summary
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Day Details Sheet - slides up from bottom */}
      <TodayEntriesSheet
        visible={!!selectedDay}
        onClose={handleCloseDetail}
        entries={dayDetails || []}
        dailyGoal={selectedDayGoal}
        date={selectedDay}
        isHistorical={isHistorical}
        historicalMessage={historicalMessage}
        loading={loadingDetails}
      />

      {/* Weekly Summary Modal */}
      <WeeklySummary
        visible={weeklySummaryVisible}
        onClose={() => setWeeklySummaryVisible(false)}
        weekStart={selectedWeekStart}
        isLiveSunday={isCurrentSunday}
      />
    </LinearGradient>
  );
}
