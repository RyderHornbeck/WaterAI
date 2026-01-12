import sql from "@/app/api/utils/sql";

const LIMITS = {
  IMAGE_UPLOADS: 20, // 20 image analyses per day
  TEXT_DESCRIPTIONS: 20, // 20 text descriptions per day
  MANUAL_ADDS: 30, // 30 manual adds per day
};

/**
 * Get the current date in the user's timezone
 * @param {string} timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns {string} - Date string in YYYY-MM-DD format
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
    console.error("Error getting local date:", error);
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Get the next midnight time in the user's timezone
 * @param {string} timezone - IANA timezone string
 * @returns {string} - Formatted time like "11:45 PM" or "12:30 AM"
 */
function getNextMidnight(timezone) {
  try {
    const now = new Date();

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Calculate minutes until midnight
    const nowInTZ = new Date(
      now.toLocaleString("en-US", { timeZone: timezone }),
    );
    const hours = nowInTZ.getHours();
    const minutes = nowInTZ.getMinutes();
    const minutesUntilMidnight = 24 * 60 - (hours * 60 + minutes);
    const hoursUntil = Math.floor(minutesUntilMidnight / 60);
    const minsUntil = minutesUntilMidnight % 60;

    if (hoursUntil === 0 && minsUntil < 60) {
      return `${minsUntil} minute${minsUntil !== 1 ? "s" : ""}`;
    } else if (hoursUntil < 24) {
      return `${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""} ${minsUntil} min`;
    }

    return "midnight";
  } catch (error) {
    console.error("Error calculating next midnight:", error);
    return "midnight";
  }
}

/**
 * Check if user has exceeded their daily limit for a SPECIFIC action type
 * NOW USES user_settings TABLE - NO GROWTH, JUST RESETS DAILY
 * @param {number} userId - The user ID
 * @param {string} limitType - Type of action: 'image_uploads', 'text_descriptions', or 'manual_adds'
 * @returns {Promise<{allowed: boolean, current: number, limit: number, resetTime: string, timezone: string}>}
 */
export async function checkDailyLimit(userId, limitType) {
  // Validate limit type
  if (
    !["image_uploads", "text_descriptions", "manual_adds"].includes(limitType)
  ) {
    throw new Error(`Invalid limit type: ${limitType}`);
  }

  // Get user's timezone and limits from user_settings
  const settings = await sql`
    SELECT 
      timezone,
      daily_image_uploads,
      daily_manual_adds,
      daily_text_descriptions,
      last_limit_date
    FROM user_settings 
    WHERE user_id = ${userId}
  `;

  if (settings.length === 0) {
    throw new Error("User settings not found");
  }

  const record = settings[0];
  const timezone = record.timezone || "America/New_York";
  const today = getLocalDate(timezone);
  const lastLimitDateRaw = record.last_limit_date;

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

  // Check if we need to reset (new day in user's timezone)
  const needsReset = !lastLimitDate || lastLimitDate !== today;

  console.log(
    `🕐 Reset Check (${limitType}): lastLimitDate="${lastLimitDate}", today="${today}", timezone="${timezone}", needsReset=${needsReset}`,
  );

  if (needsReset) {
    console.log(
      `🔄 RESETTING DAILY LIMITS for user ${userId} - New day detected!`,
    );
    // Reset all counters for the new day
    await sql`
      UPDATE user_settings
      SET 
        daily_image_uploads = 0,
        daily_manual_adds = 0,
        daily_text_descriptions = 0,
        last_limit_date = ${today}
      WHERE user_id = ${userId}
    `;

    console.log(`✅ Daily limits reset to 0 for date ${today}`);

    // Return allowed since we just reset
    const resetTime = getNextMidnight(timezone);
    return {
      allowed: true,
      current: 0,
      limit: LIMITS[limitType.toUpperCase()],
      resetTime: resetTime,
      timezone: timezone,
    };
  }

  // Get the current count for THIS SPECIFIC type
  let currentCount = 0;
  let limitForType = 0;

  switch (limitType) {
    case "image_uploads":
      currentCount = parseInt(record.daily_image_uploads || 0);
      limitForType = LIMITS.IMAGE_UPLOADS;
      break;
    case "text_descriptions":
      currentCount = parseInt(record.daily_text_descriptions || 0);
      limitForType = LIMITS.TEXT_DESCRIPTIONS;
      break;
    case "manual_adds":
      currentCount = parseInt(record.daily_manual_adds || 0);
      limitForType = LIMITS.MANUAL_ADDS;
      break;
  }

  const resetTime = getNextMidnight(timezone);

  return {
    allowed: currentCount < limitForType,
    current: currentCount,
    limit: limitForType,
    resetTime: resetTime,
    timezone: timezone,
  };
}

/**
 * Increment the daily usage counter for a specific action
 * NOW USES user_settings TABLE - NO GROWTH, JUST INCREMENTS
 * @param {number} userId - The user ID
 * @param {string} limitType - One of: 'image_uploads', 'text_descriptions', 'manual_adds'
 */
export async function incrementDailyLimit(userId, limitType) {
  // Validate limit type
  if (
    !["image_uploads", "text_descriptions", "manual_adds"].includes(limitType)
  ) {
    throw new Error(`Invalid limit type: ${limitType}`);
  }

  // Increment the specific counter in user_settings
  switch (limitType) {
    case "image_uploads":
      await sql`
        UPDATE user_settings
        SET daily_image_uploads = daily_image_uploads + 1
        WHERE user_id = ${userId}
      `;
      break;
    case "text_descriptions":
      await sql`
        UPDATE user_settings
        SET daily_text_descriptions = daily_text_descriptions + 1
        WHERE user_id = ${userId}
      `;
      break;
    case "manual_adds":
      await sql`
        UPDATE user_settings
        SET daily_manual_adds = daily_manual_adds + 1
        WHERE user_id = ${userId}
      `;
      break;
    default:
      throw new Error(`Unknown limit type: ${limitType}`);
  }

  console.log(
    `✅ Incremented ${limitType} for user ${userId} in user_settings`,
  );
}

/**
 * Get user-friendly error message for exceeding daily limit
 * @param {string} limitType - One of: 'image_uploads', 'text_descriptions', 'manual_adds'
 * @param {number} limit - The limit number
 * @param {string} resetTime - When the limit resets (e.g., "2 hours 30 min")
 * @returns {string}
 */
export function getLimitErrorMessage(limitType, limit, resetTime = "midnight") {
  const actionName =
    limitType === "image_uploads"
      ? "image analyses"
      : limitType === "text_descriptions"
        ? "text descriptions"
        : "manual entries";

  return `You've reached your daily limit of ${limit} ${actionName}. Resets in ${resetTime}. Sometimes water appears to be added, but the entry isn't actually saved. Try another method!`;
}
