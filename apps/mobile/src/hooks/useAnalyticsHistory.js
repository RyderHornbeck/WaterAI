import { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { getCache, setCache, CACHE_KEYS } from "@/utils/dataCache";
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

export function useAnalyticsHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [goalRanges, setGoalRanges] = useState([]);
  const [defaultGoal, setDefaultGoal] = useState(64);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [error, setError] = useState(null);

  // Use global settings store instead of local state
  const { dailyGoal, fetchSettings } = useUserSettingsStore();

  const fetchHistory = async (force = false) => {
    try {
      setError(null);

      // Smart cache check - don't refetch if we just fetched (within 30 seconds)
      if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) {
        console.log("⚡ Skipping history fetch - data is fresh (< 30s old)");
        setLoading(false);
        return;
      }

      // Check cache first (only if not forcing)
      if (!force) {
        const cached = await getCache(CACHE_KEYS.WATER_HISTORY);
        if (cached !== null) {
          console.log("⚡ Using cached history data");
          setHistory(cached.history || cached); // Handle old cache format
          setGoalRanges(cached.goalRanges || []);
          setDefaultGoal(cached.defaultGoal || 64);
          setLoading(false);
          setLastFetchTime(Date.now());
          return;
        }
      }

      console.log("🔄 Fetching fresh history data with retry logic...");

      // Fetch with retry logic
      const result = await fetchWithRetry("/api/water-history");

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch history");
      }

      const historyData = result.data.history || [];
      const goalRangesData = result.data.goalRanges || [];
      const defaultGoalData = result.data.defaultGoal || 64;

      setHistory(historyData);
      setGoalRanges(goalRangesData);
      setDefaultGoal(defaultGoalData);

      // Update cache with full response
      await setCache(CACHE_KEYS.WATER_HISTORY, {
        history: historyData,
        goalRanges: goalRangesData,
        defaultGoal: defaultGoalData,
      });
      setLastFetchTime(Date.now());

      console.log(
        `✅ History loaded successfully (${historyData.length} entries, ${goalRangesData.length} goal ranges)`,
      );
    } catch (err) {
      console.error("❌ Error in fetchHistory:", err);
      setError(err.message || "Failed to load history");

      // Don't completely fail - try to use cached data as fallback
      const cached = await getCache(CACHE_KEYS.WATER_HISTORY);
      if (cached !== null) {
        console.log("⚠️ Using stale cached data as fallback");
        setHistory(cached.history || cached);
        setGoalRanges(cached.goalRanges || []);
        setDefaultGoal(cached.defaultGoal || 64);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchSettings(); // Fetch from global store
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log("History tab focused - checking if refetch needed");
      fetchHistory(); // Will use cache if fresh
      fetchSettings(); // Will use cache if fresh
    }, []),
  );

  return {
    loading,
    history,
    dailyGoal,
    goalRanges,
    defaultGoal,
    refetchHistory: fetchHistory,
    error,
  };
}
