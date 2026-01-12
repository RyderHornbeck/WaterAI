import { useState, useRef, useEffect } from "react";
import { Animated } from "react-native";
import { getWeekStart } from "@/utils/dateHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function useWeekNavigation() {
  const { getCurrentDate, timeOffsetDays } = useUserSettingsStore();
  const [selectedWeekStart, setSelectedWeekStart] = useState(
    getWeekStart(getCurrentDate()),
  );
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Update selectedWeekStart when time offset changes
  useEffect(() => {
    const newWeekStart = getWeekStart(getCurrentDate());
    setSelectedWeekStart(newWeekStart);
  }, [timeOffsetDays, getCurrentDate]);

  const navigateWeek = (direction) => {
    const targetValue = direction === "left" ? 50 : -50;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: targetValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const newWeekStart = new Date(selectedWeekStart);
    newWeekStart.setDate(
      newWeekStart.getDate() + (direction === "left" ? -7 : 7),
    );
    setSelectedWeekStart(newWeekStart);
  };

  return { selectedWeekStart, slideAnim, navigateWeek };
}
