import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getCache, setCache, CACHE_KEYS } from "@/utils/dataCache";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function useSettingsData() {
  const [stats, setStats] = useState({
    totalOunces: 0,
    daysHitGoal: 0,
    totalDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const fetchStats = async (force = false) => {
    try {
      // Get current time offset from store
      const { timeOffsetDays } = useUserSettingsStore.getState();

      // If forcing, skip all cache checks and time checks
      if (force) {
        console.log("🔄 Force refreshing stats from database...");
        const response = await fetchWithAuth(
          `/api/user-stats?_fresh=${Date.now()}&offsetDays=${timeOffsetDays}`,
        );
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats({
          totalOunces: data.totalOunces || 0,
          daysHitGoal: data.daysHitGoal || 0,
          totalDays: data.totalDays || 0,
        });
        // Update cache with fresh data
        await setCache(CACHE_KEYS.USER_STATS, data);
        setLastFetchTime(Date.now());
        setLoading(false);
        console.log("✅ Stats refreshed from database");
        return;
      }

      // Smart cache check - don't refetch if we just fetched (within 30 seconds)
      if (lastFetchTime && Date.now() - lastFetchTime < 30000) {
        console.log("⚡ Skipping stats fetch - data is fresh (< 30s old)");
        setLoading(false);
        return;
      }

      // Check cache first
      const cached = await getCache(CACHE_KEYS.USER_STATS);
      if (cached !== null) {
        setStats({
          totalOunces: cached.totalOunces || 0,
          daysHitGoal: cached.daysHitGoal || 0,
          totalDays: cached.totalDays || 0,
        });
        setLoading(false);
        setLastFetchTime(Date.now());
        return;
      }

      const response = await fetchWithAuth(
        `/api/user-stats?offsetDays=${timeOffsetDays}`,
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats({
        totalOunces: data.totalOunces || 0,
        daysHitGoal: data.daysHitGoal || 0,
        totalDays: data.totalDays || 0,
      });
      // Update cache
      await setCache(CACHE_KEYS.USER_STATS, data);
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, fetchStats };
}
