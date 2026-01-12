import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/**
 * Hook to fetch the goal for a specific week
 * @param {Date} weekStartDate - Monday of the week
 * @param {boolean} enabled - Whether to enable the query
 * @returns {Object} - React Query result with weeklyGoal
 */
export function useWeeklyGoal(weekStartDate, enabled = true) {
  const weekStartString = weekStartDate
    ? weekStartDate.toISOString().split("T")[0]
    : null;

  return useQuery({
    queryKey: ["weeklyGoal", weekStartString],
    queryFn: async () => {
      if (!weekStartString) {
        throw new Error("No week start date provided");
      }

      const response = await fetchWithAuth(
        `/api/weekly-goal?weekStart=${weekStartString}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weekly goal");
      }

      const data = await response.json();
      return {
        weeklyGoal: data.weeklyGoal || 64,
        isFallback: data.isFallback || false,
      };
    },
    enabled: enabled && !!weekStartString,
    staleTime: 60000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
