import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import globalCache, { userSettingsCacheKey } from "@/app/api/utils/cache";

export async function GET(request) {
  try {
    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
    }

    // Check if fresh data is requested (bypass cache)
    const url = new URL(request.url);
    const skipCache = url.searchParams.has("_fresh");

    // Get time offset for debug/testing purposes
    const offsetDays = parseInt(url.searchParams.get("offsetDays") || "0", 10);

    // Phase 3: Check cache first (unless forcing fresh data)
    const cacheKey = `user:${userId}:stats:offset:${offsetDays}`;
    if (!skipCache) {
      const cached = globalCache.get(cacheKey);

      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, max-age=30",
          },
        });
      }
    }

    // Get total water drunk all time (excluding deleted entries)
    const totalResult = await sql`
      SELECT COALESCE(SUM(ounces), 0) as total
      FROM water_entries
      WHERE user_id = ${userId} AND is_deleted = false
    `;
    const totalOunces = parseFloat(totalResult[0]?.total || 0);

    // Get user's current daily goal, timezone, and first entry date
    const userResult = await sql`
      SELECT 
        us.daily_goal,
        us.timezone,
        au.id as user_id,
        MIN(we.entry_date) as first_entry_date
      FROM user_settings us
      JOIN auth_users au ON us.user_id = au.id
      LEFT JOIN water_entries we ON we.user_id = au.id AND we.is_deleted = false
      WHERE us.user_id = ${userId}
      GROUP BY us.daily_goal, us.timezone, au.id
    `;

    const dailyGoal = parseFloat(userResult[0]?.daily_goal || 64);
    const timezone = userResult[0]?.timezone || "America/New_York";
    const firstEntryDate = userResult[0]?.first_entry_date;

    // ✅ NEW: Find the first day with any water logged (aggregate > 0)
    const firstAggregateResult = await sql`
      SELECT MIN(entry_date) as first_aggregate_date
      FROM daily_water_aggregates
      WHERE user_id = ${userId} AND total_ounces > 0
    `;

    const firstAggregateDate = firstAggregateResult[0]?.first_aggregate_date;

    // Calculate total days since first aggregate with water > 0 (not just first entry)
    let totalDays = 0;
    if (firstAggregateDate) {
      // Get current date in user's timezone WITH offset applied
      const now = new Date();
      now.setDate(now.getDate() + offsetDays);

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
      const todayInUserTZ = `${year}-${month}-${day}`;

      // Parse first aggregate date (YYYY-MM-DD format)
      const firstDateStr =
        typeof firstAggregateDate === "string"
          ? firstAggregateDate.split("T")[0]
          : firstAggregateDate.toISOString().split("T")[0];

      // Calculate days between dates
      const first = new Date(firstDateStr + "T00:00:00");
      const today = new Date(todayInUserTZ + "T00:00:00");
      totalDays = Math.floor((today - first) / (1000 * 60 * 60 * 24)) + 1; // +1 to include first day
    }

    // ✅ NEW: Count days hit goal using historical goals from goal_history
    // For each day in daily_water_aggregates, check if it met the goal that was active on that date
    const goalDaysResult = await sql`
      WITH daily_with_goal AS (
        SELECT 
          dwa.entry_date,
          dwa.total_ounces,
          COALESCE(
            (
              SELECT daily_goal
              FROM goal_history
              WHERE goal_history.user_id = ${userId}
                AND goal_history.effective_from_date <= dwa.entry_date
              ORDER BY goal_history.effective_from_date DESC
              LIMIT 1
            ),
            ${dailyGoal}
          ) as goal_for_day
        FROM daily_water_aggregates dwa
        WHERE dwa.user_id = ${userId}
          AND dwa.total_ounces > 0
      )
      SELECT COUNT(*) as days_hit_goal
      FROM daily_with_goal
      WHERE total_ounces >= goal_for_day
    `;
    const daysHitGoal = parseInt(goalDaysResult[0]?.days_hit_goal || 0, 10);

    const responseData = {
      totalOunces: Math.round(totalOunces),
      daysHitGoal,
      totalDays,
      dailyGoal,
    };

    // Phase 3: Cache the result
    globalCache.set(cacheKey, responseData, 30000); // 30 second cache

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
