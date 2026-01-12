import sql from "./sql";

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

/**
 * OPTIMIZED: Single read to get all data needed for water analysis
 * Combines: user settings, all daily limit checks, and timezone
 * Auto-resets daily limits if it's a new day IN THE USER'S TIMEZONE
 */
export async function getUserAnalysisData(userId) {
  // First, get timezone and current limit date
  const settingsResult = await sql`
    SELECT 
      timezone,
      last_limit_date
    FROM user_settings 
    WHERE user_id = ${userId}
  `;

  if (settingsResult.length === 0) {
    return null;
  }

  const timezone = settingsResult[0].timezone || "America/New_York";
  const lastLimitDateRaw = settingsResult[0].last_limit_date;

  // Convert lastLimitDate to string in YYYY-MM-DD format if it's a Date object
  let lastLimitDate = null;
  if (lastLimitDateRaw) {
    if (lastLimitDateRaw instanceof Date) {
      lastLimitDate = lastLimitDateRaw.toISOString().split("T")[0];
    } else if (typeof lastLimitDateRaw === "string") {
      // Extract just the date part if it's already a string
      lastLimitDate = lastLimitDateRaw.split("T")[0];
    }
  }

  const today = getLocalDate(timezone); // Today in user's timezone, not UTC!

  // Check if we need to reset daily limits (new day in USER'S timezone)
  const needsReset = !lastLimitDate || lastLimitDate !== today;

  if (needsReset) {
    await sql`
      UPDATE user_settings
      SET 
        daily_image_uploads = 0,
        daily_manual_adds = 0,
        daily_text_descriptions = 0,
        last_limit_date = ${today}
      WHERE user_id = ${userId}
    `;
  }

  // Then fetch all data in one query
  const result = await sql`
    SELECT 
      hand_size,
      sip_size,
      timezone,
      daily_goal,
      COALESCE(daily_image_uploads, 0) as current_image_uploads,
      COALESCE(daily_manual_adds, 0) as current_manual_adds,
      COALESCE(daily_text_descriptions, 0) as current_text_descriptions,
      last_limit_date as limit_date
    FROM user_settings
    WHERE user_id = ${userId}
  `;

  if (result.length === 0) {
    return null;
  }

  const data = result[0];

  return {
    handSize: data.hand_size || "medium",
    sipSize: data.sip_size || "medium",
    timezone: data.timezone || "America/New_York",
    dailyGoal: data.daily_goal || 64,
    currentImageUploads: parseInt(data.current_image_uploads),
    currentManualAdds: parseInt(data.current_manual_adds),
    currentTextDescriptions: parseInt(data.current_text_descriptions),
    limitDate: data.limit_date,
  };
}

/**
 * OPTIMIZED: Single write transaction to create entry and update all aggregates
 * Does everything in one atomic operation:
 * - Insert water entry
 * - Update daily aggregates
 * - Update/insert weekly summary
 * - Increment daily usage limit in user_settings (only for manual or description entries)
 */
export async function createWaterEntryWithAggregates({
  userId,
  ounces,
  imageUrl = null,
  classification,
  liquidType,
  entryDate,
  timestamp,
  timezone = "America/New_York",
  servings = 1,
  description = null,
  createdFromFavorite = false,
}) {
  // Calculate week start date (Monday) using proper timezone handling
  // Convert entry date to user's timezone to find the correct week
  const entryDateObj = new Date(entryDate + "T12:00:00"); // Use noon to avoid DST edge cases
  const dayOfWeek = entryDateObj.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const weekStartDate = new Date(entryDateObj);
  weekStartDate.setDate(entryDateObj.getDate() - daysToMonday);
  const weekStart = weekStartDate.toISOString().split("T")[0];

  // Get week end date for days_with_data calculation
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().split("T")[0];

  // Determine time of day bucket using user's timezone
  const date = new Date(timestamp);
  const userDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone }),
  );
  const hour = userDate.getHours();

  let timeOfDayColumn = "afternoon_oz";
  if (hour >= 0 && hour < 6) timeOfDayColumn = "early_morning_oz";
  else if (hour >= 6 && hour < 12) timeOfDayColumn = "morning_oz";
  else if (hour >= 12 && hour < 17) timeOfDayColumn = "afternoon_oz";
  else if (hour >= 17 && hour < 21) timeOfDayColumn = "evening_oz";
  else timeOfDayColumn = "night_oz";

  // ✅ FIX: Create array directly instead of string - PostgreSQL jsonb_set requires text[] not string
  const liquidTypePath = [liquidType];

  // Determine if we need to increment limits
  // ✅ UPDATED: Favorites now count towards manual add limit
  // Manual entries (not from favorites) OR any favorite entry -> increment daily_manual_adds
  const shouldIncrementManualAdds =
    createdFromFavorite ||
    (classification === "manual" && !createdFromFavorite);
  const shouldIncrementDescriptionAdds =
    classification === "description" && !createdFromFavorite;

  let query;
  let params;

  if (shouldIncrementManualAdds) {
    const queryText = `
      WITH new_entry AS (
        INSERT INTO water_entries (
          user_id, ounces, image_url, classification, 
          liquid_type, entry_date, timestamp, servings, 
          description, created_from_favorite
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10
        )
        RETURNING id, ounces, entry_date, timestamp, liquid_type, classification, 
                  image_url, description, servings, created_from_favorite
      ),
      update_daily AS (
        INSERT INTO daily_water_aggregates (user_id, entry_date, total_ounces)
        SELECT $1, $6, $2
        ON CONFLICT (user_id, entry_date)
        DO UPDATE SET 
          total_ounces = daily_water_aggregates.total_ounces + $2
        RETURNING total_ounces, entry_date
      ),
      update_weekly AS (
        INSERT INTO weekly_summaries (
          user_id, week_start_date, total_ounces, days_with_data,
          ${timeOfDayColumn},
          liquid_types
        )
        VALUES (
          $1, $11, $2, 1,
          $2,
          jsonb_build_object($5, $2)
        )
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET
          total_ounces = weekly_summaries.total_ounces + $2,
          ${timeOfDayColumn} = COALESCE(weekly_summaries.${timeOfDayColumn}, 0) + $2,
          liquid_types = jsonb_set(
            COALESCE(weekly_summaries.liquid_types, '{}'::jsonb),
            $12::text[],
            to_jsonb(COALESCE((weekly_summaries.liquid_types->>$5)::numeric, 0) + $2)
          ),
          days_with_data = (
            SELECT COUNT(DISTINCT entry_date)
            FROM daily_water_aggregates
            WHERE user_id = $1
              AND entry_date >= $11
              AND entry_date <= $13
          ),
          updated_at = CURRENT_TIMESTAMP
        RETURNING week_start_date, total_ounces
      ),
      update_limit AS (
        UPDATE user_settings
        SET daily_manual_adds = daily_manual_adds + 1
        WHERE user_id = $1
        RETURNING daily_manual_adds as limit_count
      )
      SELECT 
        new_entry.*,
        update_daily.total_ounces as daily_total,
        update_weekly.total_ounces as weekly_total,
        update_limit.limit_count as new_limit_count
      FROM new_entry, update_daily, update_weekly, update_limit
    `;

    params = [
      userId,
      ounces,
      imageUrl,
      classification,
      liquidType,
      entryDate,
      timestamp,
      servings,
      description,
      createdFromFavorite,
      weekStart,
      liquidTypePath,
      weekEnd, // $13 - week end date for days_with_data calculation
    ];

    query = sql(queryText, params);
  } else if (shouldIncrementDescriptionAdds) {
    const queryText = `
      WITH new_entry AS (
        INSERT INTO water_entries (
          user_id, ounces, image_url, classification, 
          liquid_type, entry_date, timestamp, servings, 
          description, created_from_favorite
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10
        )
        RETURNING id, ounces, entry_date, timestamp, liquid_type, classification, 
                  image_url, description, servings, created_from_favorite
      ),
      update_daily AS (
        INSERT INTO daily_water_aggregates (user_id, entry_date, total_ounces)
        SELECT $1, $6, $2
        ON CONFLICT (user_id, entry_date)
        DO UPDATE SET 
          total_ounces = daily_water_aggregates.total_ounces + $2
        RETURNING total_ounces, entry_date
      ),
      update_weekly AS (
        INSERT INTO weekly_summaries (
          user_id, week_start_date, total_ounces, days_with_data,
          ${timeOfDayColumn},
          liquid_types
        )
        VALUES (
          $1, $11, $2, 1,
          $2,
          jsonb_build_object($5, $2)
        )
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET
          total_ounces = weekly_summaries.total_ounces + $2,
          ${timeOfDayColumn} = COALESCE(weekly_summaries.${timeOfDayColumn}, 0) + $2,
          liquid_types = jsonb_set(
            COALESCE(weekly_summaries.liquid_types, '{}'::jsonb),
            $12::text[],
            to_jsonb(COALESCE((weekly_summaries.liquid_types->>$5)::numeric, 0) + $2)
          ),
          days_with_data = (
            SELECT COUNT(DISTINCT entry_date)
            FROM daily_water_aggregates
            WHERE user_id = $1
              AND entry_date >= $11
              AND entry_date <= $13
          ),
          updated_at = CURRENT_TIMESTAMP
        RETURNING week_start_date, total_ounces
      ),
      update_limit AS (
        UPDATE user_settings
        SET daily_text_descriptions = daily_text_descriptions + 1
        WHERE user_id = $1
        RETURNING daily_text_descriptions as limit_count
      )
      SELECT 
        new_entry.*,
        update_daily.total_ounces as daily_total,
        update_weekly.total_ounces as weekly_total,
        update_limit.limit_count as new_limit_count
      FROM new_entry, update_daily, update_weekly, update_limit
    `;

    params = [
      userId,
      ounces,
      imageUrl,
      classification,
      liquidType,
      entryDate,
      timestamp,
      servings,
      description,
      createdFromFavorite,
      weekStart,
      liquidTypePath,
      weekEnd, // $13 - week end date for days_with_data calculation
    ];

    query = sql(queryText, params);
  } else {
    // For photo entries (already incremented in analyze-water) or favorites
    const queryText = `
      WITH new_entry AS (
        INSERT INTO water_entries (
          user_id, ounces, image_url, classification, 
          liquid_type, entry_date, timestamp, servings, 
          description, created_from_favorite
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10
        )
        RETURNING id, ounces, entry_date, timestamp, liquid_type, classification, 
                  image_url, description, servings, created_from_favorite
      ),
      update_daily AS (
        INSERT INTO daily_water_aggregates (user_id, entry_date, total_ounces)
        SELECT $1, $6, $2
        ON CONFLICT (user_id, entry_date)
        DO UPDATE SET 
          total_ounces = daily_water_aggregates.total_ounces + $2
        RETURNING total_ounces, entry_date
      ),
      update_weekly AS (
        INSERT INTO weekly_summaries (
          user_id, week_start_date, total_ounces, days_with_data,
          ${timeOfDayColumn},
          liquid_types
        )
        VALUES (
          $1, $11, $2, 1,
          $2,
          jsonb_build_object($5, $2)
        )
        ON CONFLICT (user_id, week_start_date)
        DO UPDATE SET
          total_ounces = weekly_summaries.total_ounces + $2,
          ${timeOfDayColumn} = COALESCE(weekly_summaries.${timeOfDayColumn}, 0) + $2,
          liquid_types = jsonb_set(
            COALESCE(weekly_summaries.liquid_types, '{}'::jsonb),
            $12::text[],
            to_jsonb(COALESCE((weekly_summaries.liquid_types->>$5)::numeric, 0) + $2)
          ),
          days_with_data = (
            SELECT COUNT(DISTINCT entry_date)
            FROM daily_water_aggregates
            WHERE user_id = $1
              AND entry_date >= $11
              AND entry_date <= $13
          ),
          updated_at = CURRENT_TIMESTAMP
        RETURNING week_start_date, total_ounces
      )
      SELECT 
        new_entry.*,
        update_daily.total_ounces as daily_total,
        update_weekly.total_ounces as weekly_total
      FROM new_entry, update_daily, update_weekly
    `;

    params = [
      userId,
      ounces,
      imageUrl,
      classification,
      liquidType,
      entryDate,
      timestamp,
      servings,
      description,
      createdFromFavorite,
      weekStart,
      liquidTypePath,
      weekEnd, // $13 - week end date for days_with_data calculation
    ];

    query = sql(queryText, params);
  }

  const result = await query;
  return result[0];
}

/**
 * OPTIMIZED: Single write transaction for deleting entry and updating aggregates
 * Does everything atomically:
 * - Soft delete entry
 * - Decrement daily aggregates
 * - Decrement weekly summary
 */
export async function deleteWaterEntryWithAggregates(userId, entryId) {
  // Calculate week start date for the entry
  const result = await sql`
    WITH entry_data AS (
      SELECT 
        id, ounces, entry_date, timestamp, liquid_type,
        DATE_TRUNC('week', entry_date::timestamp)::date as week_start,
        (DATE_TRUNC('week', entry_date::timestamp)::date + INTERVAL '6 days')::date as week_end
      FROM water_entries
      WHERE id = ${entryId} AND user_id = ${userId} AND is_deleted = false
    ),
    soft_delete AS (
      UPDATE water_entries
      SET is_deleted = true
      WHERE id = ${entryId} AND user_id = ${userId}
      RETURNING id
    ),
    update_daily AS (
      UPDATE daily_water_aggregates
      SET total_ounces = GREATEST(0, total_ounces - (SELECT ounces FROM entry_data))
      WHERE user_id = ${userId} 
        AND entry_date = (SELECT entry_date FROM entry_data)
      RETURNING total_ounces
    ),
    update_weekly AS (
      UPDATE weekly_summaries
      SET 
        total_ounces = GREATEST(0, total_ounces - (SELECT ounces FROM entry_data)),
        liquid_types = jsonb_set(
          liquid_types,
          ARRAY[(SELECT liquid_type FROM entry_data)],
          to_jsonb(GREATEST(0, 
            COALESCE((liquid_types->>(SELECT liquid_type FROM entry_data))::numeric, 0) 
            - (SELECT ounces FROM entry_data)
          ))
        ),
        days_with_data = (
          SELECT COUNT(DISTINCT entry_date)
          FROM daily_water_aggregates
          WHERE user_id = ${userId}
            AND entry_date >= (SELECT week_start FROM entry_data)
            AND entry_date <= (SELECT week_end FROM entry_data)
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
        AND week_start_date = (SELECT week_start FROM entry_data)
      RETURNING week_start_date
    )
    SELECT 
      entry_data.*,
      soft_delete.id as deleted_id,
      update_daily.total_ounces as new_daily_total
    FROM entry_data, soft_delete, update_daily
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}
