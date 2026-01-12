import sql from "./sql";

/**
 * Get the daily goal for a specific date using range-based goal history
 *
 * Range logic:
 * - Each goal has effective_from_date and effective_until_date
 * - effective_until_date = NULL means "end of time" (current active goal)
 * - Find the goal where: effective_from_date <= targetDate AND (effective_until_date >= targetDate OR effective_until_date IS NULL)
 *
 * @param {number} userId - The user ID
 * @param {string} targetDate - Date in YYYY-MM-DD format
 * @returns {Promise<number>} - The daily goal in ounces, defaults to 64 if no goal found
 */
export async function getGoalForDate(userId, targetDate) {
  try {
    const result = await sql`
      SELECT daily_goal
      FROM goal_history
      WHERE user_id = ${userId}
        AND effective_from_date <= ${targetDate}
        AND (effective_until_date >= ${targetDate} OR effective_until_date IS NULL)
      ORDER BY effective_from_date DESC
      LIMIT 1
    `;

    if (result.length > 0) {
      return parseFloat(result[0].daily_goal);
    }

    // Fallback: check user_settings if no goal_history found
    const settingsResult = await sql`
      SELECT daily_goal
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    if (settingsResult.length > 0) {
      return parseFloat(settingsResult[0].daily_goal);
    }

    // Ultimate fallback
    return 64;
  } catch (error) {
    console.error(`Error getting goal for date ${targetDate}:`, error);
    return 64;
  }
}

/**
 * Get the daily goal for a specific week (uses the Monday of that week)
 *
 * @param {number} userId - The user ID
 * @param {string} weekStartDate - Monday date in YYYY-MM-DD format
 * @returns {Promise<number>} - The daily goal in ounces
 */
export async function getGoalForWeek(userId, weekStartDate) {
  return getGoalForDate(userId, weekStartDate);
}

/**
 * Get goals for multiple dates efficiently (batch query)
 * Returns a map of date -> goal
 *
 * @param {number} userId - The user ID
 * @param {string[]} dates - Array of dates in YYYY-MM-DD format
 * @returns {Promise<Map<string, number>>} - Map of date to goal
 */
export async function getGoalsForDates(userId, dates) {
  if (dates.length === 0) {
    return new Map();
  }

  try {
    // Get all goal ranges for this user
    const ranges = await sql`
      SELECT daily_goal, effective_from_date, effective_until_date
      FROM goal_history
      WHERE user_id = ${userId}
      ORDER BY effective_from_date ASC
    `;

    // Get default from user_settings
    const settingsResult = await sql`
      SELECT daily_goal
      FROM user_settings
      WHERE user_id = ${userId}
    `;
    const defaultGoal =
      settingsResult.length > 0 ? parseFloat(settingsResult[0].daily_goal) : 64;

    // ✅ FIX: Normalize all range dates to YYYY-MM-DD strings for reliable comparison
    const normalizedRanges = ranges.map((range) => {
      const fromDate =
        typeof range.effective_from_date === "string"
          ? range.effective_from_date.split("T")[0]
          : range.effective_from_date?.toISOString?.().split("T")[0] ||
            range.effective_from_date;

      const untilDate = range.effective_until_date
        ? typeof range.effective_until_date === "string"
          ? range.effective_until_date.split("T")[0]
          : range.effective_until_date?.toISOString?.().split("T")[0]
        : null;

      return {
        daily_goal: range.daily_goal,
        effective_from_date: fromDate,
        effective_until_date: untilDate,
      };
    });

    // Build map of date -> goal
    const goalMap = new Map();

    for (const date of dates) {
      // ✅ Ensure date is in YYYY-MM-DD format
      const normalizedDate =
        typeof date === "string"
          ? date.split("T")[0]
          : date?.toISOString?.().split("T")[0] || date;

      let foundGoal = null;

      // Find the range that contains this date
      for (const range of normalizedRanges) {
        const fromDate = range.effective_from_date;
        const untilDate = range.effective_until_date;

        // Check if date falls within this range (all strings now, safe comparison)
        const afterStart = normalizedDate >= fromDate;
        const beforeEnd = !untilDate || normalizedDate <= untilDate;

        if (afterStart && beforeEnd) {
          foundGoal = parseFloat(range.daily_goal);
          break;
        }
      }

      goalMap.set(normalizedDate, foundGoal || defaultGoal);
    }

    return goalMap;
  } catch (error) {
    console.error(`Error getting goals for multiple dates:`, error);
    // Return default goals for all dates
    const goalMap = new Map();
    for (const date of dates) {
      goalMap.set(date, 64);
    }
    return goalMap;
  }
}
