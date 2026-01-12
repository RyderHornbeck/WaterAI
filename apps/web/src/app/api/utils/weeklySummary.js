/**
 * Weekly Summary Management
 * Handles incremental updates to weekly summaries when water entries are added/deleted
 * Updated: 2026-01-08 - Fixed SQL syntax for dynamic column updates
 */

import sql from "./sql";

// Get Monday of the week for a given date
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

// Get time bucket for a given hour
function getTimeBucket(hour) {
  if (hour >= 0 && hour < 6) return "early_morning_oz";
  if (hour >= 6 && hour < 12) return "morning_oz";
  if (hour >= 12 && hour < 17) return "afternoon_oz";
  if (hour >= 17 && hour < 21) return "evening_oz";
  return "night_oz";
}

/**
 * Update weekly summary when a water entry is created
 * This incrementally updates the weekly summary rather than recalculating everything
 */
export async function updateWeeklySummary({
  userId,
  entryDate,
  timestamp,
  ounces,
  liquidType,
  timezone,
}) {
  try {
    const weekStart = getWeekStartDate(entryDate);

    // Get user's timezone for time-of-day calculation
    const userTimezone = timezone || "America/New_York";
    const date = new Date(timestamp);
    const userDate = new Date(
      date.toLocaleString("en-US", { timeZone: userTimezone }),
    );
    const hour = userDate.getHours();
    const timeBucket = getTimeBucket(hour);

    // Get or create weekly summary
    const existingSummary = await sql`
      SELECT * FROM weekly_summaries
      WHERE user_id = ${userId} AND week_start_date = ${weekStart}
    `;

    if (existingSummary.length === 0) {
      // Create new summary - use sql() function form for dynamic column
      const liquidTypes = {};
      liquidTypes[liquidType] = parseFloat(ounces);

      const insertQuery = `
        INSERT INTO weekly_summaries (
          user_id,
          week_start_date,
          total_ounces,
          ${timeBucket},
          liquid_types
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await sql(insertQuery, [
        userId,
        weekStart,
        ounces,
        ounces,
        JSON.stringify(liquidTypes),
      ]);
    } else {
      // Update existing summary - use sql() function form for dynamic column
      const current = existingSummary[0];
      const liquidTypes =
        typeof current.liquid_types === "object"
          ? current.liquid_types
          : JSON.parse(current.liquid_types || "{}");
      liquidTypes[liquidType] =
        (parseFloat(liquidTypes[liquidType]) || 0) + parseFloat(ounces);

      const currentTimeBucketValue = parseFloat(current[timeBucket]) || 0;
      const newTimeBucketValue = currentTimeBucketValue + parseFloat(ounces);

      const updateQuery = `
        UPDATE weekly_summaries
        SET 
          total_ounces = total_ounces + $1,
          ${timeBucket} = $2,
          liquid_types = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND week_start_date = $5
      `;

      await sql(updateQuery, [
        ounces,
        newTimeBucketValue,
        JSON.stringify(liquidTypes),
        userId,
        weekStart,
      ]);
    }

    console.log(
      `[weekly-summary] Updated summary for user ${userId}, week ${weekStart}`,
    );
  } catch (error) {
    console.error("[weekly-summary] Error updating weekly summary:", error);
    // Don't throw - we don't want to fail the water entry if summary update fails
  }
}

/**
 * Update weekly summary stats from daily aggregates
 * Called periodically or when needed to sync days_with_data and days_goal_met
 * ✅ Updated to use range-based goals with effective_from_date and effective_until_date
 */
export async function syncWeeklySummaryFromDailyAggregates(
  userId,
  weekStartDate,
) {
  try {
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = new Date(weekEnd.getTime() - 86400000)
      .toISOString()
      .split("T")[0];

    // Get user's current goal as fallback
    const [userSettings] = await sql`
      SELECT daily_goal FROM user_settings WHERE user_id = ${userId}
    `;
    const currentGoal = userSettings?.daily_goal || 64;

    // ✅ Get daily aggregates for this week with range-based historical goals
    const dailyAggregates = await sql`
      SELECT 
        dwa.entry_date,
        dwa.total_ounces,
        COALESCE(
          (
            SELECT daily_goal
            FROM goal_history
            WHERE user_id = ${userId}
              AND effective_from_date <= dwa.entry_date
              AND (effective_until_date >= dwa.entry_date OR effective_until_date IS NULL)
            ORDER BY effective_from_date DESC
            LIMIT 1
          ),
          ${currentGoal}
        ) as goal_for_day
      FROM daily_water_aggregates dwa
      WHERE dwa.user_id = ${userId}
        AND dwa.entry_date >= ${weekStartStr}
        AND dwa.entry_date <= ${weekEndStr}
    `;

    const daysWithData = dailyAggregates.length;
    const daysGoalMet = dailyAggregates.filter(
      (day) => parseFloat(day.total_ounces) >= parseFloat(day.goal_for_day),
    ).length;

    // Update the weekly summary
    await sql`
      UPDATE weekly_summaries
      SET 
        days_with_data = ${daysWithData},
        days_goal_met = ${daysGoalMet},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND week_start_date = ${weekStartStr}
    `;

    console.log(
      `[weekly-summary] Synced stats for week ${weekStartStr}: ${daysWithData} days with data, ${daysGoalMet} goals met (using range-based historical goals)`,
    );
  } catch (error) {
    console.error(
      "[weekly-summary] Error syncing from daily aggregates:",
      error,
    );
  }
}

/**
 * Recalculate weekly summary when an entry is deleted
 * This decrements the values rather than recalculating everything
 */
export async function decrementWeeklySummary({
  userId,
  entryDate,
  timestamp,
  ounces,
  liquidType,
  timezone,
}) {
  try {
    const weekStart = getWeekStartDate(entryDate);

    // Get user's timezone for time-of-day calculation
    const userTimezone = timezone || "America/New_York";
    const date = new Date(timestamp);
    const userDate = new Date(
      date.toLocaleString("en-US", { timeZone: userTimezone }),
    );
    const hour = userDate.getHours();
    const timeBucket = getTimeBucket(hour);

    // Get existing summary
    const existingSummary = await sql`
      SELECT * FROM weekly_summaries
      WHERE user_id = ${userId} AND week_start_date = ${weekStart}
    `;

    if (existingSummary.length === 0) {
      console.warn(
        `[weekly-summary] No summary found for week ${weekStart}, skipping decrement`,
      );
      return;
    }

    const current = existingSummary[0];
    const liquidTypes =
      typeof current.liquid_types === "object"
        ? current.liquid_types
        : JSON.parse(current.liquid_types || "{}");

    // Decrement liquid type
    if (liquidTypes[liquidType]) {
      liquidTypes[liquidType] = Math.max(
        0,
        parseFloat(liquidTypes[liquidType]) - parseFloat(ounces),
      );
      // Remove if zero
      if (liquidTypes[liquidType] === 0) {
        delete liquidTypes[liquidType];
      }
    }

    const currentTimeBucketValue = parseFloat(current[timeBucket]) || 0;
    const newTimeBucketValue = Math.max(
      0,
      currentTimeBucketValue - parseFloat(ounces),
    );
    const newTotalOunces = Math.max(
      0,
      parseFloat(current.total_ounces) - parseFloat(ounces),
    );

    const updateQuery = `
      UPDATE weekly_summaries
      SET 
        total_ounces = $1,
        ${timeBucket} = $2,
        liquid_types = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4 AND week_start_date = $5
    `;

    await sql(updateQuery, [
      newTotalOunces,
      newTimeBucketValue,
      JSON.stringify(liquidTypes),
      userId,
      weekStart,
    ]);

    console.log(
      `[weekly-summary] Decremented summary for user ${userId}, week ${weekStart}`,
    );
  } catch (error) {
    console.error("[weekly-summary] Error decrementing weekly summary:", error);
  }
}
