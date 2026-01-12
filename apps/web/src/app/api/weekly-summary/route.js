import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { syncWeeklySummaryFromDailyAggregates } from "@/app/api/utils/weeklySummary";
import {
  getGoalForWeek,
  getGoalsForDates,
} from "@/app/api/utils/getGoalForDate";

export async function GET(request) {
  // Check for Authorization header first (mobile apps send token this way)
  const token = getTokenFromRequest(request);
  let userId = null;

  if (token) {
    const user = await validateToken(token);
    if (user) {
      userId = user.id;
      console.log(
        `[weekly-summary] Authenticated via token, userId: ${userId}`,
      );
    }
  }

  // Fall back to session cookies if no valid token
  if (!userId) {
    const session = await auth();
    if (!session?.user?.id) {
      console.log(`[weekly-summary] ❌ Unauthorized - no session or token`);
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = parseInt(session.user.id, 10);
    console.log(
      `[weekly-summary] Authenticated via session, userId: ${userId}`,
    );
  }

  if (isNaN(userId)) {
    console.log(`[weekly-summary] ❌ Invalid user ID`);
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");

  try {
    // Calculate week range
    let weekStart;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
      // Validate date
      if (isNaN(weekStart.getTime())) {
        throw new Error("Invalid weekStart date parameter");
      }
    } else {
      // Default to current week (Monday)
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday as start
      weekStart = new Date(today);
      weekStart.setDate(today.getDate() + diff);
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Previous week for comparison
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    // Get user settings for daily goal
    const [userSettings] = await sql`
      SELECT daily_goal, water_unit, timezone
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    const defaultGoal = userSettings?.daily_goal || 64;

    // Calculate week date strings
    const weekStartDate = weekStart.toISOString().split("T")[0];
    const weekEndDate = new Date(weekEnd.getTime() - 86400000)
      .toISOString()
      .split("T")[0];
    const prevWeekStartDate = prevWeekStart.toISOString().split("T")[0];

    // ✅ Use range-based goal lookup for this week
    const weeklyGoalForThisWeek = await getGoalForWeek(userId, weekStartDate);

    console.log(
      `[weekly-summary] Fetching data for user ${userId}, week ${weekStartDate} to ${weekEndDate}`,
    );
    console.log(
      `[weekly-summary] Using week goal ${weeklyGoalForThisWeek} oz for this week`,
    );

    // Get or create weekly summary
    let weeklySummary = await sql`
      SELECT * FROM weekly_summaries
      WHERE user_id = ${userId} AND week_start_date = ${weekStartDate}
    `;

    if (weeklySummary.length === 0) {
      // Create empty summary
      await sql`
        INSERT INTO weekly_summaries (user_id, week_start_date)
        VALUES (${userId}, ${weekStartDate})
      `;
      weeklySummary = await sql`
        SELECT * FROM weekly_summaries
        WHERE user_id = ${userId} AND week_start_date = ${weekStartDate}
      `;
    }

    const summary = weeklySummary[0];

    // Sync days_with_data and days_goal_met from daily aggregates
    // Pass userId and weekStartDate - the function will look up historical goals
    await syncWeeklySummaryFromDailyAggregates(userId, weekStartDate);

    // Re-fetch after sync
    const [updatedSummary] = await sql`
      SELECT * FROM weekly_summaries
      WHERE user_id = ${userId} AND week_start_date = ${weekStartDate}
    `;

    // Get daily aggregates for the week to build dailyData
    const dailyAggregates = await sql`
      SELECT entry_date, total_ounces
      FROM daily_water_aggregates
      WHERE user_id = ${userId}
        AND entry_date >= ${weekStartDate}
        AND entry_date <= ${weekEndDate}
    `;

    // Build dailyData array with historical goals
    const dailyTotalsMap = {};
    dailyAggregates.forEach((agg) => {
      const dateKey =
        agg.entry_date instanceof Date
          ? agg.entry_date.toISOString().split("T")[0]
          : agg.entry_date.toString().substring(0, 10);
      dailyTotalsMap[dateKey] = parseFloat(agg.total_ounces);
    });

    // ✅ Get historical goals for all days in the week efficiently
    const allDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      allDates.push(date.toISOString().split("T")[0]);
    }

    const dailyGoalsMap = await getGoalsForDates(userId, allDates);

    const dailyData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      const ounces = dailyTotalsMap[dateKey] || 0;
      const goalForDay = dailyGoalsMap.get(dateKey);

      dailyData.push({
        date: dateKey,
        dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        ounces,
        goalMet: ounces >= goalForDay,
        dailyGoal: goalForDay,
      });
    }

    // Calculate stats from dailyData
    const totalOunces = parseFloat(updatedSummary.total_ounces) || 0;
    const averageDaily = totalOunces / 7;
    const daysGoalMet = dailyData.filter((d) => d.goalMet).length; // Use dailyData with historical goals

    // Find highest and lowest days
    const sortedDays = [...dailyData].sort((a, b) => b.ounces - a.ounces);
    const highestDay = sortedDays[0] || { date: null, ounces: 0 };
    const lowestDay = sortedDays[sortedDays.length - 1] || {
      date: null,
      ounces: 0,
    };

    // Calculate longest streak
    let currentStreak = 0;
    let longestStreak = 0;
    dailyData.forEach((day) => {
      if (day.goalMet) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    // Time of day data - read from stored values
    const timeOfDayTotals = {
      earlyMorning: parseFloat(updatedSummary.early_morning_oz) || 0,
      morning: parseFloat(updatedSummary.morning_oz) || 0,
      afternoon: parseFloat(updatedSummary.afternoon_oz) || 0,
      evening: parseFloat(updatedSummary.evening_oz) || 0,
      night: parseFloat(updatedSummary.night_oz) || 0,
    };

    // Calculate percentages
    const timeOfDayPercentages = {};
    Object.keys(timeOfDayTotals).forEach((key) => {
      timeOfDayPercentages[key] =
        totalOunces > 0
          ? Math.round((timeOfDayTotals[key] / totalOunces) * 100 * 10) / 10
          : 0;
    });

    // Determine dominant time
    const timeEntries = Object.entries(timeOfDayTotals);
    timeEntries.sort((a, b) => b[1] - a[1]);
    const dominantTime = timeEntries[0][0];

    // Liquid types - read from stored JSON
    const liquidTypes =
      typeof updatedSummary.liquid_types === "object"
        ? updatedSummary.liquid_types
        : JSON.parse(updatedSummary.liquid_types || "{}");

    const waterOunces = parseFloat(liquidTypes.water) || 0;
    const waterPercentage =
      totalOunces > 0 ? (waterOunces / totalOunces) * 100 : 0;

    // Previous week comparison - read from stored weekly summary
    let prevWeekSummary = await sql`
      SELECT * FROM weekly_summaries
      WHERE user_id = ${userId} AND week_start_date = ${prevWeekStartDate}
    `;

    let prevWeekAverage = 0;
    let prevWeekGoalsMet = 0;

    if (prevWeekSummary.length > 0) {
      const prevSummary = prevWeekSummary[0];
      const prevTotal = parseFloat(prevSummary.total_ounces) || 0;
      prevWeekAverage = prevTotal / 7;
      prevWeekGoalsMet = prevSummary.days_goal_met || 0;
    }

    const averageChange = averageDaily - prevWeekAverage;
    const goalsMetChange = daysGoalMet - prevWeekGoalsMet;

    return Response.json({
      weekRange: {
        start: weekStartDate,
        end: weekEndDate,
      },
      dailyGoal: weeklyGoalForThisWeek, // ✅ Use week-specific goal
      summary: {
        averageDaily: Math.round(averageDaily * 100) / 100,
        totalOunces: Math.round(totalOunces * 100) / 100,
        daysGoalMet,
        longestStreak,
        highestDay: {
          date: highestDay.date,
          ounces: Math.round(highestDay.ounces * 100) / 100,
        },
        lowestDay: {
          date: lowestDay.date,
          ounces: Math.round(lowestDay.ounces * 100) / 100,
        },
      },
      dailyData,
      timeOfDay: {
        data: timeOfDayTotals,
        percentages: timeOfDayPercentages,
        dominantTime,
      },
      liquidTypes: {
        data: liquidTypes,
        waterPercentage: Math.round(waterPercentage * 10) / 10,
      },
      comparison: {
        averageChange: Math.round(averageChange * 100) / 100,
        goalsMetChange,
        previousAverage: Math.round(prevWeekAverage * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching weekly summary:", error);
    return Response.json(
      { error: "Failed to fetch weekly summary" },
      { status: 500 },
    );
  }
}
