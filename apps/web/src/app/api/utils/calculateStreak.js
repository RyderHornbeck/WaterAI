import sql from "@/app/api/utils/sql";

/**
 * Calculate and update the user's current water intake streak
 * A streak is the number of consecutive days the user met their daily goal
 * @param {number} userId - The user's ID
 * @returns {Promise<number>} The current streak count
 */
export async function calculateAndUpdateStreak(userId) {
  try {
    // Get user's daily goal
    const settingsRows = await sql`
      SELECT daily_goal FROM user_settings WHERE user_id = ${userId} LIMIT 1
    `;

    if (!settingsRows || settingsRows.length === 0) {
      return 0;
    }

    const dailyGoal = parseFloat(settingsRows[0].daily_goal) || 64;

    // Calculate 60 days ago cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Get recent days (last 60 days) from water_entries
    const recentDailyTotals = await sql`
      SELECT entry_date, SUM(ounces) as daily_total
      FROM water_entries
      WHERE user_id = ${userId}
        AND entry_date >= ${cutoffDateStr}
      GROUP BY entry_date
      ORDER BY entry_date DESC
    `;

    // Get historical days (older than 60 days) from daily_water_aggregates
    const historicalDailyTotals = await sql`
      SELECT entry_date, total_ounces as daily_total
      FROM daily_water_aggregates
      WHERE user_id = ${userId}
        AND entry_date < ${cutoffDateStr}
      ORDER BY entry_date DESC
    `;

    // Combine both results
    const dailyTotals = [...recentDailyTotals, ...historicalDailyTotals].sort(
      (a, b) => new Date(b.entry_date) - new Date(a.entry_date),
    );

    if (!dailyTotals || dailyTotals.length === 0) {
      // No entries yet, streak is 0
      await sql`
        UPDATE user_settings 
        SET current_streak = 0, last_entry_date = NULL
        WHERE user_id = ${userId}
      `;
      return 0;
    }

    // Calculate streak by going backwards from today
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);

    // Convert dailyTotals to a map for faster lookup
    const totalsMap = new Map();
    for (const row of dailyTotals) {
      const dateStr = new Date(row.entry_date).toISOString().split("T")[0];
      totalsMap.set(dateStr, parseFloat(row.daily_total) || 0);
    }

    // Check backwards day by day
    for (let i = 0; i < 365; i++) {
      // Max 1 year streak check
      const checkDateStr = checkDate.toISOString().split("T")[0];
      const dayTotal = totalsMap.get(checkDateStr) || 0;

      if (dayTotal >= dailyGoal) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1); // Go back one day
      } else {
        // Streak broken
        break;
      }
    }

    // Get the most recent entry date
    const lastEntryDate = dailyTotals[0].entry_date;

    // Update the streak in the database
    await sql`
      UPDATE user_settings 
      SET current_streak = ${streak}, last_entry_date = ${lastEntryDate}
      WHERE user_id = ${userId}
    `;

    console.log(`✓ Updated streak for user ${userId}: ${streak} days`);

    return streak;
  } catch (error) {
    console.error("Error calculating streak:", error);
    return 0;
  }
}

/**
 * Get the user's current streak without recalculating
 * @param {number} userId - The user's ID
 * @returns {Promise<number>} The current streak count
 */
export async function getStreak(userId) {
  try {
    const rows = await sql`
      SELECT current_streak FROM user_settings WHERE user_id = ${userId} LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return 0;
    }

    return parseInt(rows[0].current_streak, 10) || 0;
  } catch (error) {
    console.error("Error getting streak:", error);
    return 0;
  }
}
