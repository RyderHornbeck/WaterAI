import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

export async function GET(request) {
  try {
    // ✅ Support both token auth (mobile) and session auth (web)
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

    // Get total entries count
    const totalEntriesResult = await sql`
      SELECT COUNT(*) as total_entries
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_deleted = false
    `;

    // Get total soft-deleted entries count
    const softDeletedEntriesResult = await sql`
      SELECT COUNT(*) as soft_deleted_entries
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_deleted = true
    `;

    // Get daily aggregates count
    const dailyAggregatesResult = await sql`
      SELECT COUNT(*) as daily_aggregates
      FROM daily_water_aggregates
      WHERE user_id = ${userId}
    `;

    // Get weekly summaries count
    const weeklySummariesResult = await sql`
      SELECT COUNT(*) as weekly_summaries
      FROM weekly_summaries
      WHERE user_id = ${userId}
    `;

    // Get last cleanup date
    const lastCleanupResult = await sql`
      SELECT last_cleanup_date
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    // Get oldest entry date
    const oldestEntryResult = await sql`
      SELECT MIN(entry_date) as oldest_entry_date
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_deleted = false
    `;

    // Get most recent entry date
    const mostRecentEntryResult = await sql`
      SELECT MAX(entry_date) as most_recent_date
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_deleted = false
    `;

    // Calculate current cutoff date (most recent - 40 days)
    let cutoffDate = null;
    let entriesToDelete = 0;

    if (mostRecentEntryResult[0]?.most_recent_date) {
      const mostRecentDate = new Date(
        mostRecentEntryResult[0].most_recent_date,
      );
      const cutoff = new Date(mostRecentDate);
      cutoff.setDate(cutoff.getDate() - 40);
      cutoffDate = cutoff.toISOString().split("T")[0];

      // Count entries that would be deleted if cleanup ran now
      const entriesToDeleteResult = await sql`
        SELECT COUNT(*) as entries_to_delete
        FROM water_entries
        WHERE user_id = ${userId}
          AND entry_date < ${cutoffDate}
          AND is_deleted = false
      `;

      entriesToDelete = parseInt(
        entriesToDeleteResult[0]?.entries_to_delete || 0,
      );
    }

    return Response.json({
      totalEntries: parseInt(totalEntriesResult[0]?.total_entries || 0),
      softDeletedEntries: parseInt(
        softDeletedEntriesResult[0]?.soft_deleted_entries || 0,
      ),
      dailyAggregates: parseInt(
        dailyAggregatesResult[0]?.daily_aggregates || 0,
      ),
      weeklySummaries: parseInt(
        weeklySummariesResult[0]?.weekly_summaries || 0,
      ),
      lastCleanupDate: lastCleanupResult[0]?.last_cleanup_date || null,
      oldestEntryDate: oldestEntryResult[0]?.oldest_entry_date || null,
      mostRecentEntryDate: mostRecentEntryResult[0]?.most_recent_date || null,
      cutoffDate,
      entriesToDelete,
    });
  } catch (error) {
    console.error("Error getting cleanup stats:", error);
    return Response.json(
      {
        error: "Failed to get cleanup stats",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
