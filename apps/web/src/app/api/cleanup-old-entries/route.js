import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

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
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0];
  }
}

export async function POST(request) {
  const timestamp = Date.now();
  try {
    console.log(
      `[${timestamp}] [cleanup] === CHECKING 40-DAY CLEANUP STATUS ===`,
    );

    // ✅ Support both token auth (mobile) and session auth (web)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        console.log(
          `[${timestamp}] [cleanup] Authenticated via token, userId: ${userId}`,
        );
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        console.log(
          `[${timestamp}] [cleanup] ❌ Unauthorized - no session or token`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
      console.log(
        `[${timestamp}] [cleanup] Authenticated via session, userId: ${userId}`,
      );
    }

    if (isNaN(userId)) {
      console.log(`[${timestamp}] [cleanup] ❌ Invalid user ID`);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // ✅ NEW: Check if this is a forced cleanup (from manual button)
    const body = await request.json().catch(() => ({}));
    const forceCleanup = body.force === true;

    if (forceCleanup) {
      console.log(
        `[${timestamp}] [cleanup] 🔄 FORCED cleanup requested (manual button)`,
      );
    }

    // ✅ NEW: Get user's timezone and last cleanup date
    const userSettings = await sql`
      SELECT timezone, last_cleanup_date
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    if (!userSettings || userSettings.length === 0) {
      console.log(`[${timestamp}] [cleanup] ❌ User settings not found`);
      return Response.json(
        { error: "User settings not found" },
        { status: 404 },
      );
    }

    const timezone = userSettings[0].timezone || "America/New_York";
    const lastCleanupDateRaw = userSettings[0].last_cleanup_date;

    // Convert lastCleanupDate to string in YYYY-MM-DD format if it's a Date object
    let lastCleanupDate = null;
    if (lastCleanupDateRaw) {
      if (lastCleanupDateRaw instanceof Date) {
        lastCleanupDate = lastCleanupDateRaw.toISOString().split("T")[0];
      } else if (typeof lastCleanupDateRaw === "string") {
        lastCleanupDate = lastCleanupDateRaw.split("T")[0];
      }
    }

    const todayInUserTimezone = getLocalDate(timezone);

    console.log(`[${timestamp}] [cleanup] User timezone: ${timezone}`);
    console.log(
      `[${timestamp}] [cleanup] Today in user timezone: ${todayInUserTimezone}`,
    );
    console.log(
      `[${timestamp}] [cleanup] Last cleanup date: ${lastCleanupDate || "never"}`,
    );

    // ✅ NEW: Check if cleanup already ran today (skip only if NOT forced)
    if (!forceCleanup && lastCleanupDate === todayInUserTimezone) {
      console.log(
        `[${timestamp}] [cleanup] ⏭️  Background cleanup already ran today. Resets at 12:00 AM user time (${timezone}).`,
      );
      return Response.json({
        skipped: true,
        message: `Background cleanup already ran today. Resets at 12:00 AM user time (${timezone}).`,
        lastCleanupDate: lastCleanupDate,
        nextCleanup: `Tomorrow at 12:00 AM ${timezone}`,
      });
    }

    console.log(
      `[${timestamp}] [cleanup] === STARTING 40-DAY HARD DELETE CLEANUP ===`,
    );

    // Find the most recent entry date for this user (excluding soft-deleted entries)
    const mostRecentEntry = await sql`
      SELECT MAX(entry_date) as most_recent_date
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_deleted = false
    `;

    if (!mostRecentEntry[0]?.most_recent_date) {
      console.log(`[${timestamp}] [cleanup] No entries found for user`);
      // ✅ Update last cleanup date to today in user's timezone
      await sql`
        UPDATE user_settings 
        SET last_cleanup_date = ${todayInUserTimezone}
        WHERE user_id = ${userId}
      `;

      return Response.json({
        message: "No entries to cleanup",
        entriesProcessed: 0,
        imagesDeleted: 0,
        lastCleanupDate: todayInUserTimezone,
      });
    }

    // Calculate cutoff date: most recent entry date - 40 days (NOT today - 40 days)
    const mostRecentDate = new Date(mostRecentEntry[0].most_recent_date);
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 40);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    console.log(
      `[${timestamp}] [cleanup] Most recent entry date: ${mostRecentDate.toISOString().split("T")[0]}`,
    );
    console.log(
      `[${timestamp}] [cleanup] Cutoff date (most recent - 40 days): ${cutoffDateStr}`,
    );

    // Step 1: Find all non-deleted entries older than cutoff date FOR THIS USER
    console.log(`[${timestamp}] [cleanup] Step 1: Finding old entries...`);
    const oldEntries = await sql`
      SELECT id, user_id, entry_date, ounces, image_url, liquid_type, timestamp, classification
      FROM water_entries
      WHERE user_id = ${userId} 
        AND entry_date < ${cutoffDateStr}
        AND is_deleted = false
      ORDER BY entry_date
    `;

    console.log(
      `[${timestamp}] [cleanup] Found ${oldEntries.length} entries older than cutoff date`,
    );

    if (oldEntries.length === 0) {
      // ✅ Update last cleanup date to today in user's timezone even if nothing to clean
      await sql`
        UPDATE user_settings 
        SET last_cleanup_date = ${todayInUserTimezone}
        WHERE user_id = ${userId}
      `;

      return Response.json({
        message: "No entries to cleanup",
        entriesProcessed: 0,
        imagesDeleted: 0,
        lastCleanupDate: todayInUserTimezone,
        deletionDetails: {
          byType: {},
          byLiquid: {},
        },
      });
    }

    // ✅ NEW: Count by classification and liquid type before deletion
    const deletionDetails = {
      byType: {},
      byLiquid: {},
    };

    for (const entry of oldEntries) {
      // Count by classification
      const classification = entry.classification || "unknown";
      deletionDetails.byType[classification] =
        (deletionDetails.byType[classification] || 0) + 1;

      // Count by liquid type
      const liquidType = entry.liquid_type || "water";
      deletionDetails.byLiquid[liquidType] =
        (deletionDetails.byLiquid[liquidType] || 0) + 1;
    }

    // Step 2: Group by entry_date, calculate daily totals
    console.log(
      `[${timestamp}] [cleanup] Step 2: Aggregating entries by date...`,
    );
    const aggregates = {};

    for (const entry of oldEntries) {
      const dateKey =
        entry.entry_date.toISOString?.().split("T")[0] || entry.entry_date;

      if (!aggregates[dateKey]) {
        aggregates[dateKey] = {
          entry_date: dateKey,
          total_ounces: 0,
        };
      }

      aggregates[dateKey].total_ounces += parseFloat(entry.ounces) || 0;
    }

    console.log(
      `[${timestamp}] [cleanup] Aggregated into ${Object.keys(aggregates).length} daily totals`,
    );

    // Step 3: Ensure daily aggregates exist (upsert)
    console.log(
      `[${timestamp}] [cleanup] Step 3: Upserting daily aggregates...`,
    );
    let insertedCount = 0;
    for (const agg of Object.values(aggregates)) {
      await sql`
        INSERT INTO daily_water_aggregates (user_id, entry_date, total_ounces)
        VALUES (${userId}, ${agg.entry_date}, ${agg.total_ounces})
        ON CONFLICT (user_id, entry_date) 
        DO UPDATE SET total_ounces = EXCLUDED.total_ounces
      `;
      insertedCount++;
    }

    console.log(
      `[${timestamp}] [cleanup] Inserted/updated ${insertedCount} daily aggregates`,
    );

    // Step 4: Find affected weeks (for weekly summary recalculation)
    console.log(`[${timestamp}] [cleanup] Step 4: Finding affected weeks...`);

    // Get all unique weeks that will be affected
    const affectedWeeks = new Set();
    for (const entry of oldEntries) {
      const entryDate = new Date(entry.entry_date);
      const dayOfWeek = entryDate.getDay();
      const daysToMonday = (dayOfWeek + 6) % 7;
      const weekStart = new Date(entryDate);
      weekStart.setDate(entryDate.getDate() - daysToMonday);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      affectedWeeks.add(weekStartStr);
    }

    console.log(
      `[${timestamp}] [cleanup] Found ${affectedWeeks.size} affected weeks`,
    );

    // Step 5: Count images for reporting (NOT deleting from R2, just counting)
    const imagesCount = oldEntries.filter((e) => e.image_url).length;
    console.log(
      `[${timestamp}] [cleanup] Found ${imagesCount} image URLs (will be removed from DB only, not from R2)`,
    );

    // Step 6: HARD DELETE old entries (permanently remove from database)
    console.log(
      `[${timestamp}] [cleanup] Step 5: Hard deleting ${oldEntries.length} entries...`,
    );
    await sql`
      DELETE FROM water_entries
      WHERE user_id = ${userId} 
        AND entry_date < ${cutoffDateStr}
        AND is_deleted = false
    `;

    console.log(
      `[${timestamp}] [cleanup] ✅ HARD DELETED ${oldEntries.length} entries from database`,
    );

    // Step 6b: VACUUM to immediately reclaim disk space
    console.log(
      `[${timestamp}] [cleanup] Step 5b: Running VACUUM to reclaim disk space...`,
    );
    await sql`VACUUM water_entries`;
    console.log(
      `[${timestamp}] [cleanup] ✅ VACUUM completed - disk space reclaimed`,
    );

    // Step 7: Recalculate days_with_data for affected weeks
    console.log(
      `[${timestamp}] [cleanup] Step 6: Recalculating weekly summaries for ${affectedWeeks.size} affected weeks...`,
    );

    let weeksUpdated = 0;
    for (const weekStartStr of affectedWeeks) {
      const weekStart = new Date(weekStartStr);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split("T")[0];

      // Count how many days have data in this week (after deletion)
      const daysWithDataResult = await sql`
        SELECT COUNT(DISTINCT entry_date) as days_count
        FROM daily_water_aggregates
        WHERE user_id = ${userId}
          AND entry_date >= ${weekStartStr}
          AND entry_date <= ${weekEndStr}
      `;

      const daysWithData = parseInt(daysWithDataResult[0]?.days_count || 0);

      // Update the weekly summary's days_with_data count
      await sql`
        UPDATE weekly_summaries
        SET 
          days_with_data = ${daysWithData},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
          AND week_start_date = ${weekStartStr}
      `;

      weeksUpdated++;
    }

    console.log(
      `[${timestamp}] [cleanup] ✅ Updated days_with_data for ${weeksUpdated} weekly summaries`,
    );

    // ✅ Step 8: Update last cleanup date to today in user's timezone
    console.log(
      `[${timestamp}] [cleanup] Step 7: Updating last cleanup date to ${todayInUserTimezone}...`,
    );
    await sql`
      UPDATE user_settings 
      SET last_cleanup_date = ${todayInUserTimezone}
      WHERE user_id = ${userId}
    `;

    const result = {
      message: "Cleanup completed successfully",
      mostRecentEntryDate: mostRecentDate.toISOString().split("T")[0],
      cutoffDate: cutoffDateStr,
      entriesProcessed: oldEntries.length,
      imagesDeleted: imagesCount,
      dailyAggregatesCreated: insertedCount,
      weeklySummariesUpdated: weeksUpdated,
      lastCleanupDate: todayInUserTimezone,
      nextCleanup: `Tomorrow at 12:00 AM ${timezone}`,
      deletionDetails: deletionDetails,
      forced: forceCleanup,
    };

    console.log(`[${timestamp}] [cleanup] === CLEANUP COMPLETE ===`);
    console.log(
      `[${timestamp}] [cleanup] Water entries: HARD DELETED from database`,
    );
    console.log(
      `[${timestamp}] [cleanup] Images in R2: NOT TOUCHED (still in cloud storage)`,
    );
    console.log(`[${timestamp}] [cleanup] Daily aggregates: PRESERVED`);
    console.log(
      `[${timestamp}] [cleanup] Weekly summaries: PRESERVED and UPDATED`,
    );
    console.log(
      `[${timestamp}] [cleanup] Next cleanup: Tomorrow at 12:00 AM ${timezone}`,
    );
    console.log(
      `[${timestamp}] [cleanup] Deletion details:`,
      JSON.stringify(deletionDetails, null, 2),
    );

    return Response.json(result);
  } catch (error) {
    console.error(`[${timestamp}] [cleanup] ❌ ERROR DURING CLEANUP:`, error);
    console.error(`[${timestamp}] [cleanup] Error name:`, error.name);
    console.error(`[${timestamp}] [cleanup] Error message:`, error.message);
    console.error(`[${timestamp}] [cleanup] Error stack:`, error.stack);
    return Response.json(
      {
        error: "Cleanup failed",
        details: error.message,
        errorName: error.name,
      },
      { status: 500 },
    );
  }
}
