import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import globalCache, { waterHistoryCacheKey } from "@/app/api/utils/cache";
import { getGoalsForDates } from "@/app/api/utils/getGoalForDate";

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
      userId = parseInt(session.user.id, 10);
    }

    if (isNaN(userId)) {
      console.error("Invalid user ID:", userId);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Phase 3: Check cache first
    const cacheKey = waterHistoryCacheKey(userId);
    const cached = globalCache.get(cacheKey);

    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    // Calculate 40 days ago cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 40);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Get recent entries (last 40 days) from water_entries
    const recentEntries = await sql`
      SELECT 
        entry_date,
        ROUND(SUM(ounces)::numeric, 2) as total_ounces,
        COUNT(*) as entry_count
      FROM water_entries
      WHERE user_id = ${userId}
        AND entry_date >= ${cutoffDateStr}
        AND is_deleted = false
      GROUP BY entry_date
      ORDER BY entry_date DESC
    `;

    // Get historical aggregates (older than 40 days) from daily_water_aggregates
    const historicalAggregates = await sql`
      SELECT 
        entry_date,
        ROUND(total_ounces::numeric, 2) as total_ounces,
        0 as entry_count
      FROM daily_water_aggregates
      WHERE user_id = ${userId}
        AND entry_date < ${cutoffDateStr}
      ORDER BY entry_date DESC
      LIMIT 365
    `;

    // Combine both results
    let history = [...recentEntries, ...historicalAggregates]
      .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
      .slice(0, 365); // Limit to 1 year of history

    // ✅ Batch fetch all goals efficiently using range-based system
    const dates = history.map((entry) => {
      return typeof entry.entry_date === "string"
        ? entry.entry_date.split("T")[0]
        : entry.entry_date.toISOString().split("T")[0];
    });

    const goalsMap = await getGoalsForDates(userId, dates);

    // Map goals to history entries
    history = history.map((entry) => {
      const dateKey =
        typeof entry.entry_date === "string"
          ? entry.entry_date.split("T")[0]
          : entry.entry_date.toISOString().split("T")[0];

      return {
        ...entry,
        daily_goal: goalsMap.get(dateKey) || 64,
      };
    });

    // ✅ Get goal ranges for the frontend to use for dates without entries
    const goalRanges = await sql`
      SELECT daily_goal, effective_from_date, effective_until_date
      FROM goal_history
      WHERE user_id = ${userId}
      ORDER BY effective_from_date ASC
    `;

    // Get current default goal
    const settingsResult = await sql`
      SELECT daily_goal
      FROM user_settings
      WHERE user_id = ${userId}
    `;
    const defaultGoal =
      settingsResult.length > 0 ? parseFloat(settingsResult[0].daily_goal) : 64;

    const responseData = {
      history: history || [],
      goalRanges: goalRanges.map((r) => ({
        goal: parseFloat(r.daily_goal),
        // Ensure clean YYYY-MM-DD format (strip timestamps)
        from:
          typeof r.effective_from_date === "string"
            ? r.effective_from_date.split("T")[0]
            : r.effective_from_date?.toISOString().split("T")[0] ||
              r.effective_from_date,
        until: r.effective_until_date
          ? typeof r.effective_until_date === "string"
            ? r.effective_until_date.split("T")[0]
            : r.effective_until_date.toISOString().split("T")[0]
          : null,
      })),
      defaultGoal,
    };

    // Phase 3: Cache the result
    globalCache.set(cacheKey, responseData, 60000); // 1 minute cache

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("Error fetching water history:", {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Graceful degradation - return empty history
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        {
          error: "Database temporarily unavailable. Please try again.",
          history: [],
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Failed to fetch history", history: [] },
      { status: 500 },
    );
  }
}
