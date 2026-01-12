/**
 * Water tracking API endpoint - handles fetching and adding water entries
 * Updated: 2026-01-08 - Added daily aggregates and weekly summary updates
 */

import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import globalCache, {
  dailyStatsCacheKey,
  invalidateUserCaches,
} from "@/app/api/utils/cache";
import { getLimitErrorMessage } from "@/app/api/utils/dailyLimits";
import {
  createWaterEntryWithAggregates,
  getUserAnalysisData,
} from "@/app/api/utils/optimizedWaterEntry";

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

async function getUserId(request) {
  // Check for Authorization header first (mobile apps send token this way)
  const token = getTokenFromRequest(request);

  if (token) {
    const user = await validateToken(token);
    if (user) {
      console.log("Token validated successfully", { userId: user.id });
      return user.id;
    }
  }

  // Fall back to session cookies if no valid token
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return parseInt(session.user.id, 10);
}

export async function GET(request) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNaN(userId)) {
      console.error("Invalid user ID:", userId);
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

    // Check for cache-busting parameter (used after adding water)
    const skipCache = url.searchParams.get("_fresh") === "1";

    // Phase 3: Check cache first (unless fresh data requested)
    const cacheKey = dailyStatsCacheKey(userId, queryDate);

    if (!skipCache) {
      const cached = globalCache.get(cacheKey);

      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, max-age=30", // 30 second browser cache
          },
        });
      }
    }

    // Use same query pattern as water-history endpoint (which works correctly)
    const results = await sql`
      SELECT 
        id,
        ounces,
        timestamp,
        classification,
        image_url,
        description,
        entry_date,
        servings,
        liquid_type,
        is_favorited,
        favorite_order,
        created_from_favorite
      FROM water_entries
      WHERE user_id = ${userId} 
        AND entry_date = ${queryDate}
        AND is_deleted = false
      ORDER BY timestamp ASC
    `;

    // Calculate total from results
    const total = results.reduce(
      (sum, entry) => sum + parseFloat(entry.ounces || 0),
      0,
    );

    const responseData = { total, entries: results || [] };

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
    console.error("Error fetching today's water:", {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    // Graceful degradation - return empty data instead of crashing
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        {
          error: "Database temporarily unavailable. Please try again.",
          total: 0,
          entries: [],
        },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "Failed to fetch water data", total: 0, entries: [] },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNaN(userId)) {
      console.error("Invalid user ID:", userId);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error("Invalid JSON in add water request:", err.message);
      return Response.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Parse and validate ounces
    const ounces = parseFloat(body.ounces);

    if (!body.ounces || isNaN(ounces) || ounces <= 0) {
      console.error("Invalid ounces:", body.ounces);
      return Response.json(
        { error: "Invalid amount - must be a positive number" },
        { status: 400 },
      );
    }

    // Validate reasonable range (0.1 to 500 oz) - increased to allow larger entries
    if (ounces < 0.1 || ounces > 500) {
      console.error("Ounces out of range:", ounces);
      return Response.json(
        { error: "Amount must be between 0.1 and 500 ounces" },
        { status: 400 },
      );
    }

    // Round to 2 decimal places for better precision
    const roundedOunces = Math.round(ounces * 100) / 100;

    // Get classification from body, default to 'reusable-bottle'
    const classification = body.classification || "reusable-bottle";

    // Get image_url and description from body (optional fields)
    const imageUrl = body.image_url || null;
    const description = body.description || null;
    const servings = body.servings || 1;
    const liquidType = body.liquid_type || "water";
    const createdFromFavorite = body.created_from_favorite || false;

    // 🚀 OPTIMIZED: Get user data and check limits in one query
    let userData = null;
    let timezone = "America/New_York";

    // ✅ FIX: Check limit for BOTH manual entries AND favorite entries
    if (classification === "manual" || createdFromFavorite) {
      // Fetch userData to check manual_adds limit for both manual and favorite entries
      userData = await getUserAnalysisData(userId);

      if (!userData) {
        return Response.json(
          { error: "User settings not found" },
          { status: 404 },
        );
      }

      timezone = userData.timezone;

      const MANUAL_ADD_LIMIT = 30; // Daily limit for manual adds and favorites
      if (userData.currentManualAdds >= MANUAL_ADD_LIMIT) {
        return Response.json(
          {
            error: getLimitErrorMessage(
              "manual_adds",
              MANUAL_ADD_LIMIT,
              "midnight",
            ),
            limitExceeded: true,
            limitType: "manual_adds",
            current: userData.currentManualAdds,
            limit: MANUAL_ADD_LIMIT,
          },
          { status: 429 },
        );
      }
    } else {
      // Still need timezone for non-manual entries
      const settingsResult = await sql`
        SELECT timezone FROM user_settings WHERE user_id = ${userId} LIMIT 1
      `;
      timezone = settingsResult[0]?.timezone || "America/New_York";
    }

    // Use current timestamp for idempotency checking
    // If client sends timestamp, use it; otherwise use server time
    const entryTimestamp = body.timestamp || new Date().toISOString();

    // Calculate local date if not provided
    let entryDate = body.entry_date;

    if (!entryDate) {
      entryDate = getLocalDateInTimezone(timezone);
    }

    // 🚀 OPTIMIZED: Single transaction does everything (including limit increment for manual entries)
    const insertedEntry = await createWaterEntryWithAggregates({
      userId,
      ounces: roundedOunces,
      imageUrl,
      classification,
      liquidType,
      entryDate,
      timestamp: entryTimestamp,
      timezone,
      servings,
      description,
      createdFromFavorite,
    });

    // Invalidate user's caches
    invalidateUserCaches(userId);

    // Return immediately with success
    return Response.json({
      success: true,
      ounces: roundedOunces,
      timestamp: insertedEntry.timestamp,
      id: insertedEntry.id,
      entry_date: insertedEntry.entry_date,
      classification: insertedEntry.classification,
      image_url: insertedEntry.image_url,
      description: insertedEntry.description,
      servings: insertedEntry.servings,
      liquid_type: insertedEntry.liquid_type,
      created_from_favorite: insertedEntry.created_from_favorite,
    });
  } catch (error) {
    console.error("Error adding water:", error.message, error.stack);

    // Graceful degradation
    if (
      error.message?.includes("connection") ||
      error.message?.includes("timeout")
    ) {
      return Response.json(
        { error: "Database temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }

    // Check for constraint violations
    if (error.code === "23505") {
      // unique_violation
      return Response.json(
        { error: "Duplicate entry detected" },
        { status: 409 },
      );
    }

    return Response.json({ error: "Failed to add water" }, { status: 500 });
  }
}
