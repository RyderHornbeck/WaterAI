import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useWeeklySummaryData(visible, weekStart) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, weekStart]);

  const fetchData = async () => {
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (weekStart) {
        params.append("weekStart", weekStart.toISOString());
      }

      const url = `/api/weekly-summary?${params.toString()}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`,
        );
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching weekly summary:", err);
      setError(err?.message || "Failed to load weekly summary");
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}
