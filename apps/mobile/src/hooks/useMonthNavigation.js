import { useState, useRef, useEffect } from "react";
import { Animated } from "react-native";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function useMonthNavigation() {
  const { getCurrentDate, timeOffsetDays } = useUserSettingsStore();
  const [currentMonth, setCurrentMonth] = useState(getCurrentDate());
  const slideAnimMonth = useRef(new Animated.Value(0)).current;

  // Update currentMonth when time offset changes
  useEffect(() => {
    setCurrentMonth(getCurrentDate());
  }, [timeOffsetDays, getCurrentDate]);

  const navigateMonth = (direction) => {
    const targetValue = direction === "left" ? 50 : -50;
    Animated.sequence([
      Animated.timing(slideAnimMonth, {
        toValue: targetValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimMonth, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();

    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === "left" ? -1 : 1));
    setCurrentMonth(newMonth);
  };

  return { currentMonth, slideAnimMonth, navigateMonth };
}
