import { useEffect, useRef } from "react";
import { setCache, CACHE_KEYS } from "@/utils/dataCache";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useHistoryPrefetch() {
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Only prefetch once per app session
    if (hasPrefetched.current) {
      return;
    }

    const prefetchHistory = async () => {
      try {
        console.log("📊 Prefetching history data on app open...");

        const response = await fetchWithAuth("/api/water-history");
        if (!response.ok) {
          console.warn("Failed to prefetch history");
          return;
        }

        const data = await response.json();

        // Cache the history data
        await setCache(CACHE_KEYS.WATER_HISTORY, data.history || []);

        console.log("✅ History data prefetched and cached");
        hasPrefetched.current = true;
      } catch (err) {
        console.error("Error prefetching history:", err);
      }
    };

    // Small delay to not block initial app render
    const timer = setTimeout(prefetchHistory, 100);

    return () => clearTimeout(timer);
  }, []);
}
