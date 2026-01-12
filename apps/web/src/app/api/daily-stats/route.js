import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import globalCache, { dailyStatsCacheKey } from "@/app/api/utils/cache";
import { getGoalForDate } from "@/app/api/utils/getGoalForDate";

// Helper to get local date in user's timezone
function getLocalDateInTimezone(timezone) {
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
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0];
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID:", session.user.id);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get user's timezone from settings
    const settingsResult = await sql`
      SELECT timezone
      FROM user_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const timezone = settingsResult[0]?.timezone || "America/New_York";

    // Get date from query parameter or use current date in user's timezone
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const queryDate = dateParam || getLocalDateInTimezone(timezone);

    // Phase 3: Check cache first
    const cacheKey = dailyStatsCacheKey(userId, queryDate);
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

    // Calculate 40 days ago cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 40);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    let todayResult;

    // Check if the query date is older than 40 days
    if (queryDate < cutoffDateStr) {
      // Query from historical aggregates
      todayResult = await sql`
        SELECT COALESCE(total_ounces, 0) as total
        FROM daily_water_aggregates
        WHERE user_id = ${userId} AND entry_date = ${queryDate}
      `;
    } else {
      // Query from recent entries
      todayResult = await sql`
        SELECT COALESCE(SUM(ounces), 0) as total
        FROM water_entries
        WHERE user_id = ${userId} 
          AND entry_date = ${queryDate}
          AND is_deleted = false
      `;
    }

    // Safely parse values with fallbacks
    const total = parseFloat(todayResult[0]?.total) || 0;

    // ✅ Use range-based goal lookup for the specific date
    const goal = await getGoalForDate(userId, queryDate);

    // Ensure goal is reasonable
    const safeGoal = Math.max(1, Math.min(goal, 512));

    const responseData = {
      total,
      goal: safeGoal,
      progress: Math.min((total / safeGoal) * 100, 100),
    };

    // Phase 3: Cache the result
    globalCache.set(cacheKey, responseData, 30000);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (error) {
    console.error("Error fetching daily stats:", {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Graceful degradation - return defaults
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        {
          error: "Database temporarily unavailable. Showing defaults.",
          total: 0,
          goal: 64,
          progress: 0,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: "Failed to fetch stats",
        total: 0,
        goal: 64,
        progress: 0,
      },
      { status: 500 },
    );
  }
}
