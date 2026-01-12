import sql from "@/app/api/utils/sql";
import { invalidateUserCaches } from "@/app/api/utils/cache";
import { updateWeeklySummary } from "@/app/api/utils/weeklySummary";

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

// Create a water entry in the database
export async function createWaterEntry({
  userId,
  ounces,
  classification,
  liquidType,
  servings,
}) {
  // Get user's timezone from settings
  const settings = await sql`
    SELECT timezone FROM user_settings WHERE user_id = ${userId}
  `;
  const timezone = settings[0]?.timezone || "America/New_York";

  // Get the local date in the user's timezone
  const localDate = getLocalDateInTimezone(timezone);
  const timestamp = new Date().toISOString();

  const waterEntry = await sql`
    INSERT INTO water_entries (
      user_id,
      ounces,
      entry_date,
      timestamp,
      classification,
      liquid_type,
      servings,
      processing_status
    )
    VALUES (
      ${userId},
      ${ounces},
      ${localDate},
      ${timestamp},
      ${classification},
      ${liquidType},
      ${servings || 1},
      'complete'
    )
    RETURNING id
  `;

  // Update weekly summary incrementally
  await updateWeeklySummary({
    userId,
    entryDate: localDate,
    timestamp,
    ounces,
    liquidType,
    timezone,
  });

  // Invalidate user's caches
  invalidateUserCaches(userId);

  return {
    id: waterEntry[0].id,
    timestamp,
  };
}
