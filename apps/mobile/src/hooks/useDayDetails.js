import { useState } from "react";
import { getDateString } from "@/utils/dateHelpers";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

// Session storage cache for day details
const dayDetailsCache = {};

// Function to clear cache for a specific date
export function clearDayDetailsCache(date) {
  const dateStr = getDateString(date);
  delete dayDetailsCache[dateStr];
  console.log("Cleared cache for:", dateStr);
}

export function useDayDetails() {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [historicalMessage, setHistoricalMessage] = useState(null);

  const fetchDayDetails = async (date) => {
    const dateStr = getDateString(date);

    // Check cache first
    if (dayDetailsCache[dateStr]) {
      console.log("Using cached day details for:", dateStr);
      const cached = dayDetailsCache[dateStr];
      setDayDetails(cached.entries || []);
      setIsHistorical(cached.isHistorical || false);
      setHistoricalMessage(cached.message || null);
      return cached; // Return cached data including goalForDay
    }

    setLoadingDetails(true);
    try {
      console.log("Fetching day details for:", dateStr);

      const response = await fetchWithAuth(`/api/day-details?date=${dateStr}`);
      console.log("Day details response status:", response.status);

      if (!response.ok) throw new Error("Failed to fetch day details");

      const data = await response.json();
      console.log("Day details data received:", data);

      const entries = data.entries || [];
      const historical = data.isHistorical || false;
      const message = data.message || null;
      const goalForDay = data.dailyGoal || 64; // Extract historical goal from API

      // Store in cache with goalForDay
      dayDetailsCache[dateStr] = {
        entries,
        isHistorical: historical,
        message,
        goalForDay,
      };
      console.log("Cached day details for:", dateStr);

      setDayDetails(entries);
      setIsHistorical(historical);
      setHistoricalMessage(message);

      return { entries, isHistorical: historical, message, goalForDay };
    } catch (err) {
      console.error("Error fetching day details:", err);
      setDayDetails([]);
      setIsHistorical(false);
      setHistoricalMessage(null);
      return {
        entries: [],
        isHistorical: false,
        message: null,
        goalForDay: 64,
      };
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDayPress = (date) => {
    console.log("Day pressed:", date);
    setSelectedDay(date);
    fetchDayDetails(date);
  };

  const handleCloseDetail = () => {
    setSelectedDay(null);
    setDayDetails([]);
  };

  // Function to refetch the currently selected day
  const refetchCurrentDay = () => {
    if (selectedDay) {
      console.log("Refetching current day:", selectedDay);
      // Clear cache for this day and refetch
      clearDayDetailsCache(selectedDay);
      fetchDayDetails(selectedDay);
    }
  };

  return {
    selectedDay,
    dayDetails,
    loadingDetails,
    isHistorical,
    historicalMessage,
    handleDayPress,
    handleCloseDetail,
    refetchCurrentDay,
  };
}
