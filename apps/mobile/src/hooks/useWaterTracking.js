import { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { clearDayDetailsCache } from "./useDayDetails";
import {
  getCache,
  setCache,
  CACHE_KEYS,
  invalidateWaterCaches,
} from "@/utils/dataCache";
import useUserSettingsStore from "@/stores/useUserSettingsStore";
import { Alert } from "react-native";
import { getLocalDate } from "@/utils/dateHelpers";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

/**
 * Fetch with retry logic and exponential backoff
 * SECURITY: Uses fetchWithAuth to include authentication token
 */
async function fetchWithRetry(
  url,
  options = {},
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY,
) {
  try {
    console.log(
      `📡 Fetching ${url} (${MAX_RETRIES - retries + 1}/${MAX_RETRIES + 1})`,
    );

    // Use fetchWithAuth for security
    const response = await fetchWithAuth(url, options);

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
      return fetchWithRetry(url, options, retries - 1, nextDelay);
    }

    // No retries left, return error
    console.error(
      `🚫 Failed to fetch ${url} after ${MAX_RETRIES + 1} attempts`,
    );
    return { success: false, error: error.message, data: null };
  }
}

// Helper function to prefetch history data in the background
async function prefetchHistory() {
  try {
    console.log("📊 Prefetching history data after water add...");

    const response = await fetchWithAuth("/api/water-history");
    if (!response.ok) {
      console.warn("Failed to prefetch history");
      return;
    }

    const data = await response.json();

    // Cache the history data so it's ready when user navigates to history tab
    await setCache(CACHE_KEYS.WATER_HISTORY, data.history || []);

    console.log("✅ History data prefetched and cached");
  } catch (err) {
    console.error("Error prefetching history:", err);
    // Don't throw - this is a background operation
  }
}

export function useWaterTracking() {
  const [todayTotal, setTodayTotal] = useState(0);
  const [entries, setEntries] = useState([]);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Use global settings store instead of local state
  const { dailyGoal, fetchSettings, getCurrentDate } = useUserSettingsStore();

  const fetchTodayTotal = async (force = false) => {
    try {
      // Smart cache check - don't refetch if we just fetched (within 30 seconds)
      if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) {
        console.log("⚡ Skipping fetch - data is fresh (< 30s old)");
        return;
      }

      const localDate = getLocalDate(); // Use time travel date
      console.log("Fetching water data for date:", localDate);

      // Check cache first (only if not forcing)
      if (!force) {
        const cached = await getCache(CACHE_KEYS.WATER_TODAY);
        if (cached !== null && cached.date === localDate) {
          console.log("⚡ Using cached water data:", cached);
          setTodayTotal(parseFloat(cached.total) || 0);
          if (cached.entries && cached.entries.length > 0) {
            let cumulative = 0;
            const processedEntries = cached.entries.map((entry) => {
              cumulative += parseFloat(entry.ounces) || 0;
              return {
                ...entry,
                cumulativeTotal: cumulative,
              };
            });
            setEntries(processedEntries);
          } else {
            setEntries([]);
          }
          setLastFetchTime(Date.now());
          return;
        }
      }

      // Add cache-busting parameter when forcing fresh data
      const cacheBuster = force ? "&_fresh=1" : "";
      const url = `/api/water-today?date=${localDate}${cacheBuster}`;
      const fetchOptions = force ? { cache: "no-store" } : {};

      // Fetch with retry logic (uses fetchWithAuth internally)
      const result = await fetchWithRetry(url, fetchOptions);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch today total");
      }

      const data = result.data;
      console.log("Water data received:", data);

      const parsedTotal = parseFloat(data.total) || 0;
      console.log("Setting today total to:", parsedTotal);
      setTodayTotal(parsedTotal);

      if (data.entries && data.entries.length > 0) {
        let cumulative = 0;
        const processedEntries = data.entries.map((entry) => {
          cumulative += parseFloat(entry.ounces) || 0;
          return {
            ...entry,
            cumulativeTotal: cumulative,
          };
        });
        console.log("Setting entries:", processedEntries);
        setEntries(processedEntries);
      } else {
        console.log("No entries found, setting to empty array");
        setEntries([]);
      }

      // Update cache
      await setCache(CACHE_KEYS.WATER_TODAY, {
        date: localDate,
        total: data.total,
        entries: data.entries || [],
      });

      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("❌ Error fetching today total:", err);

      // Try to use cached data as fallback
      const cached = await getCache(CACHE_KEYS.WATER_TODAY);
      if (cached !== null) {
        console.log("⚠️ Using stale cached data as fallback");
        setTodayTotal(parseFloat(cached.total) || 0);
        if (cached.entries && cached.entries.length > 0) {
          let cumulative = 0;
          const processedEntries = cached.entries.map((entry) => {
            cumulative += parseFloat(entry.ounces) || 0;
            return {
              ...entry,
              cumulativeTotal: cumulative,
            };
          });
          setEntries(processedEntries);
        } else {
          setEntries([]);
        }
      }
    }
  };

  useEffect(() => {
    fetchSettings(); // Fetch settings from global store
    fetchTodayTotal();
  }, []);

  // Refetch data whenever the screen comes into focus (with smart caching)
  useFocusEffect(
    React.useCallback(() => {
      console.log("Main tracker page focused - checking if refetch needed");
      fetchSettings(); // Will use cache if fresh
      fetchTodayTotal(); // Will use cache if fresh
    }, []),
  );

  const addWater = async (
    ounces,
    classification,
    imageUrl = null,
    description = null,
    servings = 1,
    liquidType = null,
    createdFromFavorite = false, // NEW: Track if created from favorite
  ) => {
    // Parse ounces as number immediately at boundary
    const numericOunces = parseFloat(ounces);

    console.log("💧 addWater called with imageUrl:", imageUrl);

    if (!numericOunces || isNaN(numericOunces) || numericOunces <= 0) {
      console.error("Invalid ounces value:", ounces);
      return;
    }

    try {
      // Always optimistically update UI immediately for fast feedback
      setTodayTotal((prev) => {
        const prevNum = parseFloat(prev) || 0;
        return prevNum + numericOunces;
      });

      // Get REAL local date (not time-travel date)
      const localDate = getLocalDate();
      const timestamp = new Date().toISOString();

      console.log("Adding water for date:", localDate, "timestamp:", timestamp);

      // Save to database with local date, classification, image_url, description, servings, liquid_type, and created_from_favorite
      // SECURITY: Use fetchWithAuth instead of plain fetch
      const response = await fetchWithAuth("/api/water-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ounces: numericOunces,
          entry_date: localDate,
          timestamp: timestamp,
          classification: classification,
          image_url: imageUrl,
          description: description,
          servings: servings,
          liquid_type: liquidType,
          created_from_favorite: createdFromFavorite, // NEW: Send to API
        }),
      });

      const data = await response.json();

      // Check for limit errors
      if (response.status === 429 && data.limitExceeded) {
        // Revert optimistic update
        setTodayTotal((prev) => {
          const prevNum = parseFloat(prev) || 0;
          return prevNum - numericOunces;
        });
        Alert.alert("Daily Limit Reached", data.error);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to save water entry");
      }

      // Invalidate all water-related caches
      await invalidateWaterCaches();

      // Clear the cache for the REAL current date
      clearDayDetailsCache(new Date());

      // Small delay to ensure server cache clears and DB transaction commits
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Force refresh to get accurate total from server
      await fetchTodayTotal(true); // Pass true to force fetch

      // ✨ Prefetch history data in background so it's ready when user navigates to history tab
      prefetchHistory();
    } catch (err) {
      console.error("Error adding water:", err);
      // Always revert optimistic update on error
      setTodayTotal((prev) => {
        const prevNum = parseFloat(prev) || 0;
        return prevNum - numericOunces;
      });
    }
  };

  const progress = (todayTotal / dailyGoal) * 100; // Allow progress to exceed 100%

  return {
    todayTotal,
    dailyGoal,
    progress,
    addWater,
    fetchTodayTotal,
    entries,
  };
}
