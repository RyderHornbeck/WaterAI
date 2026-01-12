import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { invalidateUserCaches } from "@/app/api/utils/cache";

/**
 * Helper to get local date in user's timezone (YYYY-MM-DD format)
 */
function getLocalDate(timezone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === "year").value;
    const month = parts.find((p) => p.type === "month").value;
    const day = parts.find((p) => p.type === "day").value;
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error getting local date in timezone:", error);
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Helper to get Monday of current week in user's timezone
 */
function getCurrentMonday(timezone) {
  try {
    const today = getLocalDate(timezone);
    const todayDate = new Date(today + "T12:00:00");
    const dayOfWeek = todayDate.getDay();
    const daysToMonday = (dayOfWeek + 6) % 7; // 0 if Monday, 1 if Tuesday, etc.
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() - daysToMonday);
    return monday.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error calculating current Monday:", error);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    return monday.toISOString().split("T")[0];
  }
}

/**
 * Helper to get Monday of NEXT week in user's timezone
 */
function getNextMonday(timezone) {
  try {
    const currentMonday = getCurrentMonday(timezone);
    const mondayDate = new Date(currentMonday + "T12:00:00");
    const nextMonday = new Date(mondayDate);
    nextMonday.setDate(mondayDate.getDate() + 7);
    return nextMonday.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error calculating next Monday:", error);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday + 7);
    return monday.toISOString().split("T")[0];
  }
}

/**
 * Helper to get last Sunday in user's timezone
 */
function getLastSunday(timezone) {
  try {
    const monday = getCurrentMonday(timezone);
    const mondayDate = new Date(monday + "T12:00:00");
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() - 1);
    return sunday.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error calculating last Sunday:", error);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() - 1);
    return sunday.toISOString().split("T")[0];
  }
}

/**
 * Helper to get this Sunday (end of current week) in user's timezone
 */
function getThisSunday(timezone) {
  try {
    const nextMonday = getNextMonday(timezone);
    const nextMondayDate = new Date(nextMonday + "T12:00:00");
    const thisSunday = new Date(nextMondayDate);
    thisSunday.setDate(nextMondayDate.getDate() - 1);
    return thisSunday.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error calculating this Sunday:", error);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + daysToSunday);
    return sunday.toISOString().split("T")[0];
  }
}

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(
      `[API update-goal POST ${timestamp}] === UPDATING GOAL (WEEK-BASED) ===`,
    );

    // Auth check
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
    }

    if (isNaN(userId)) {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { dailyGoal, timezone } = body;

    // Validate dailyGoal
    const goalNum = parseFloat(dailyGoal);
    if (!dailyGoal || isNaN(goalNum) || goalNum <= 0) {
      return Response.json(
        { error: "Invalid daily goal - must be a positive number" },
        { status: 400 },
      );
    }

    // Get user's timezone
    const userTimezone = timezone || "America/New_York";

    // Calculate date boundaries - goal starts NEXT MONDAY
    const currentMonday = getCurrentMonday(userTimezone);
    const nextMonday = getNextMonday(userTimezone);
    const thisSunday = getThisSunday(userTimezone);

    console.log(
      `[API update-goal POST ${timestamp}] User ${userId} updating goal:`,
      {
        newGoal: goalNum,
        timezone: userTimezone,
        currentMonday,
        nextMonday,
        thisSunday,
        effectiveFrom: nextMonday, // New goal starts next Monday
      },
    );

    // ✅ First, check what goal ranges currently exist
    const existingRanges = await sql`
      SELECT id, daily_goal, effective_from_date, effective_until_date
      FROM goal_history
      WHERE user_id = ${userId}
      ORDER BY effective_from_date DESC
      LIMIT 5
    `;

    console.log(
      `[API update-goal POST ${timestamp}] Existing goal ranges:`,
      existingRanges,
    );

    // Execute week-based goal update in a transaction
    await sql.transaction([
      // Step 1: Close out any existing open-ended goal ranges
      // Set their effective_until_date to THIS SUNDAY (end of current week)
      sql`
        UPDATE goal_history
        SET effective_until_date = ${thisSunday}
        WHERE user_id = ${userId}
          AND effective_until_date IS NULL
      `,

      // Step 2: Create new goal range starting NEXT MONDAY with no end date
      sql`
        INSERT INTO goal_history (
          user_id, 
          daily_goal, 
          effective_from_date, 
          effective_until_date
        )
        VALUES (
          ${userId}, 
          ${goalNum}, 
          ${nextMonday}, 
          NULL
        )
        ON CONFLICT (user_id, effective_from_date)
        DO UPDATE SET 
          daily_goal = ${goalNum},
          effective_until_date = NULL
      `,

      // Step 3: Update user_settings.daily_goal for future default
      sql`
        UPDATE user_settings
        SET daily_goal = ${goalNum}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `,

      // Step 4: Update weekly_goals for NEXT week (starting next Monday)
      sql`
        INSERT INTO weekly_goals (user_id, week_start_date, weekly_goal)
        VALUES (${userId}, ${nextMonday}, ${goalNum})
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET weekly_goal = ${goalNum}
      `,
    ]);

    console.log(`[API update-goal POST ${timestamp}] ✅ Goal ranges updated:`, {
      oldRangeClosed: `beginning → ${thisSunday} (this Sunday)`,
      newRangeOpened: `${nextMonday} (next Monday) → end of time`,
      newGoal: goalNum,
      currentWeekUnchanged: true,
    });

    // Invalidate user's caches
    invalidateUserCaches(userId);

    return Response.json({
      success: true,
      newGoal: goalNum,
      effectiveFrom: nextMonday,
      message: `Your new goal of ${goalNum} oz will start next Monday!`,
    });
  } catch (error) {
    console.error(`[API update-goal POST ${timestamp}] ❌ ERROR:`, error);
    return Response.json({ error: "Failed to update goal" }, { status: 500 });
  }
}
