import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { getGoalForWeek } from "@/app/api/utils/getGoalForDate";

/**
 * GET /api/weekly-goal?weekStart=YYYY-MM-DD
 * Returns the goal for a specific week
 */
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
    const weekStartParam = searchParams.get("weekStart");

    if (!weekStartParam) {
      return Response.json(
        { error: "weekStart parameter required (YYYY-MM-DD format, Monday)" },
        { status: 400 },
      );
    }

    // Use range-based goal lookup
    const weeklyGoal = await getGoalForWeek(userId, weekStartParam);

    return Response.json({
      weeklyGoal,
      weekStartDate: weekStartParam,
    });
  } catch (error) {
    console.error("Error fetching weekly goal:", error);
    return Response.json(
      { error: "Failed to fetch weekly goal" },
      { status: 500 },
    );
  }
}
