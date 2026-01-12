import { getDateString } from "./dateHelpers";

/**
 * Get progress percentage for a date using its historical goal
 */
export function getProgressForDate(
  date,
  history,
  fallbackGoal = 64,
  goalRanges = [],
) {
  const dateStr = getDateString(date);
  const dayData = history.find((h) => h.entry_date.startsWith(dateStr));
  if (!dayData) return 0;

  const totalOz = parseFloat(dayData.total_ounces);

  // Use the same goal lookup logic as getGoalForDate
  const goalForDay = getGoalForDate(date, history, fallbackGoal, goalRanges);

  return Math.min((totalOz / goalForDay) * 100, 100);
}

export function getOuncesForDate(date, history) {
  const dateStr = getDateString(date);
  const dayData = history.find((h) => h.entry_date.startsWith(dateStr));
  return dayData ? parseFloat(dayData.total_ounces) : 0;
}

/**
 * Get the goal for a specific date from history or goal ranges
 */
export function getGoalForDate(
  date,
  history,
  fallbackGoal = 64,
  goalRanges = [],
) {
  const dateStr = getDateString(date);

  // First, check if we have an entry for this date
  const dayData = history.find((h) => h.entry_date.startsWith(dateStr));
  if (dayData?.daily_goal) {
    return dayData.daily_goal;
  }

  // If no entry, use goal ranges to find the correct goal for this date
  if (goalRanges && goalRanges.length > 0) {
    for (const range of goalRanges) {
      const afterStart = dateStr >= range.from;
      const beforeEnd = !range.until || dateStr <= range.until;

      if (afterStart && beforeEnd) {
        return range.goal;
      }
    }
  }

  // Ultimate fallback
  return fallbackGoal;
}

/**
 * Get graph data with historical goals for each day
 */
export function getGraphData(
  weekDates,
  history,
  fallbackGoal = 64,
  goalRanges = [],
) {
  return weekDates.map((date) => {
    const ounces = getOuncesForDate(date, history);
    const dailyGoal = getGoalForDate(date, history, fallbackGoal, goalRanges);
    return {
      date: date,
      value: ounces,
      dailyGoal, // Include the goal for this specific day
    };
  });
}

/**
 * Get a map of date -> goal for a range of dates
 */
export function getDailyGoalsMap(
  dates,
  history,
  fallbackGoal = 64,
  goalRanges = [],
) {
  const goalsMap = {};
  dates.forEach((date) => {
    const dateKey = date.toISOString().split("T")[0];
    goalsMap[dateKey] = getGoalForDate(date, history, fallbackGoal, goalRanges);
  });
  return goalsMap;
}
