import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY,
) {
  try {
    console.log(
      `📡 Fetching ${url} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES + 1})`,
    );

    const response = await fetchWithAuth(url);

    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Try to parse JSON
    const data = await response.json();

    console.log(`✅ Successfully fetched ${url}`);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Error fetching ${url}:`, error.message);

    // If we have retries left, try again with exponential backoff
    if (retries > 0) {
      const nextDelay = Math.min(delay * 2, MAX_RETRY_DELAY);
      console.log(
        `⏳ Retrying ${url} in ${delay}ms... (${retries} retries left)`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, nextDelay);
    }

    // No retries left, return error
    console.error(
      `🚫 Failed to fetch ${url} after ${MAX_RETRIES + 1} attempts`,
    );
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Hook to fetch all initial data needed for the app
 * Fetches user settings, today's data, weekly data, monthly data, and user stats
 * WITH RETRY LOGIC AND COMPREHENSIVE ERROR HANDLING
 */
export function useInitialDataLoad() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const setSettings = useUserSettingsStore((state) => state.setSettings);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log("🔄 Starting initial data load with retry logic...");
      setLoading(true);
      setError(null);

      // Fetch all data with retry logic
      // Each endpoint is fetched independently so partial failures don't block the app
      const [
        userGoalResult,
        todayResult,
        weeklyResult,
        monthlyResult,
        statsResult,
      ] = await Promise.all([
        fetchWithRetry("/api/user-goal"),
        fetchWithRetry("/api/water-today"),
        fetchWithRetry("/api/weekly-summary"),
        fetchWithRetry("/api/water-history?range=month"),
        fetchWithRetry("/api/user-stats"),
      ]);

      // Check for critical failures (user goal is required)
      if (!userGoalResult.success) {
        throw new Error("Failed to load user settings. Please try again.");
      }

      // Log any partial failures but continue
      const failures = [];
      if (!todayResult.success) failures.push("today's data");
      if (!weeklyResult.success) failures.push("weekly data");
      if (!monthlyResult.success) failures.push("monthly data");
      if (!statsResult.success) failures.push("user stats");

      if (failures.length > 0) {
        console.warn(`⚠️ Partial data load failure: ${failures.join(", ")}`);
      }

      // Extract data (use defaults for failed requests)
      const userGoalData = userGoalResult.data || {};
      const todayData = todayResult.data || {};
      const weeklyData = weeklyResult.data || {};
      const monthlyData = monthlyResult.data || { history: [] };
      const statsData = statsResult.data || {};

      console.log("✓ User goal loaded:", userGoalData);
      console.log("✓ Today's data loaded:", todayData);
      console.log("✓ Weekly data loaded:", weeklyData);
      console.log("✓ Monthly data loaded:", monthlyData);
      console.log("✓ Stats loaded:", statsData);

      // Store user settings in Zustand store
      setSettings({
        dailyGoal: parseFloat(userGoalData.dailyGoal) || 64,
        handSize: userGoalData.handSize || "medium",
        sipSize: userGoalData.sipSize || "medium",
        onboardingCompleted: userGoalData.onboardingCompleted || false,
        waterUnit: userGoalData.waterUnit || "oz",
        gender: userGoalData.gender,
        age: userGoalData.age,
        heightCm: userGoalData.heightCm,
        weightKg: userGoalData.weightKg,
        activityLevel: userGoalData.activityLevel,
        lastCleanupDate: userGoalData.lastCleanupDate || null,
        notificationsEnabled: userGoalData.notificationsEnabled || false,
        notificationTimes:
          userGoalData.notificationTimes || "09:00,12:00,17:00",
      });

      // Return all the data for components to use
      const loadedData = {
        // User settings
        dailyGoal: parseFloat(userGoalData.dailyGoal) || 64,
        handSize: userGoalData.handSize || "medium",
        sipSize: userGoalData.sipSize || "medium",
        waterUnit: userGoalData.waterUnit || "oz",

        // Today's progress
        todayOunces: todayData.totalOunces || 0,
        todayEntries: todayData.entries || [],
        todayProgress: todayData.progress || 0,

        // Weekly data
        weeklyData: weeklyData,

        // Monthly data (for history page calendar)
        monthlyData: monthlyData,

        // User stats for settings page
        currentStreak: statsData.currentStreak || 0,
        totalWaterDrank: statsData.totalWaterDrank || 0,
        totalEntries: statsData.totalEntries || 0,
        averageDaily: statsData.averageDaily || 0,

        // Track any partial failures
        partialFailures: failures,
      };

      console.log("✅ All initial data loaded successfully");
      setData(loadedData);
      setLoading(false);
    } catch (err) {
      console.error("❌ Critical error loading initial data:", err);
      setError(err.message || "Failed to load data");
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    data,
    retry: loadInitialData,
  };
}
