import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { getGoalForDate } from "@/app/api/utils/getGoalForDate";

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
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    console.log("=== DAY DETAILS API ===");
    console.log("User ID:", userId);
    console.log("Date requested:", date);

    if (!date) {
      return Response.json(
        { error: "Date parameter required" },
        { status: 400 },
      );
    }

    // ✅ Use range-based goal lookup for the specific date
    const goalForDay = await getGoalForDate(userId, date);

    // Calculate 40 days ago cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 40);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Check if the query date is older than 40 days
    if (date < cutoffDateStr) {
      console.log("Date is older than 40 days - fetching aggregate only");

      // Fetch aggregate total for this historical date
      const aggregate = await sql`
        SELECT total_ounces
        FROM daily_water_aggregates
        WHERE user_id = ${userId}
          AND entry_date = ${date}::date
      `;

      const total = parseFloat(aggregate[0]?.total_ounces) || 0;

      return Response.json({
        entries: [],
        isHistorical: true,
        dailyTotal: total,
        dailyGoal: goalForDay,
        message: "Detailed entries are only available for the last 40 days",
      });
    }

    // Fetch all entries for the specific date (recent data)
    const entries = await sql`
      SELECT 
        id,
        ounces,
        timestamp,
        image_url,
        classification,
        description,
        servings,
        liquid_type,
        is_favorited,
        created_from_favorite
      FROM water_entries
      WHERE user_id = ${userId}
        AND entry_date = ${date}::date
        AND is_deleted = false
      ORDER BY timestamp ASC
    `;

    console.log("Entries found:", entries.length);
    console.log("Entries data:", JSON.stringify(entries, null, 2));

    return Response.json({
      entries: entries || [],
      isHistorical: false,
      dailyGoal: goalForDay, // Include the goal that was active on this date
    });
  } catch (error) {
    console.error("Error fetching day details:", error);
    return Response.json(
      { error: "Failed to fetch day details", entries: [] },
      { status: 500 },
    );
  }
}
