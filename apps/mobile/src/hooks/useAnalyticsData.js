import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useAnalyticsData() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(64);

  const fetchUserGoal = async () => {
    try {
      // SECURITY: Use fetchWithAuth instead of plain fetch
      const response = await fetchWithAuth("/api/user-goal");
      if (!response.ok) throw new Error("Failed to fetch goal");
      const data = await response.json();
      if (data.dailyGoal) {
        setDailyGoal(data.dailyGoal);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      // SECURITY: Use fetchWithAuth instead of plain fetch
      const response = await fetchWithAuth("/api/water-history");
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();

      // Map history to include the historical goal for each day
      const historyWithGoals = (data.history || []).map((entry) => ({
        ...entry,
        goalForDay: entry.daily_goal || 64, // Use the historical goal from API
      }));

      setHistory(historyWithGoals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refetchData = () => {
    fetchHistory();
    fetchUserGoal();
  };

  useEffect(() => {
    refetchData();
  }, []);

  return {
    loading,
    history,
    dailyGoal,
    refetchData,
  };
}
