import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

// GET notification settings
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
      userId = session.user.id;
    }

    const settings = await sql`
      SELECT notifications_enabled, notification_times 
      FROM user_settings 
      WHERE user_id = ${userId}
    `;

    if (settings.length === 0) {
      return Response.json({
        notifications_enabled: false,
        notification_times: "09:00,12:00,17:00", // Default: 9am, 12pm, 5pm daily
      });
    }

    return Response.json({
      notifications_enabled: settings[0].notifications_enabled,
      notification_times: settings[0].notification_times,
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return Response.json(
      { error: "Failed to fetch notification settings" },
      { status: 500 },
    );
  }
}

// POST update notification settings
export async function POST(request) {
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
      userId = session.user.id;
    }

    const { notifications_enabled, notification_times } = await request.json();

    // Check if user_settings exists
    const existing = await sql`
      SELECT id FROM user_settings WHERE user_id = ${userId}
    `;

    if (existing.length === 0) {
      // Create new settings
      await sql`
        INSERT INTO user_settings (user_id, notifications_enabled, notification_times)
        VALUES (${userId}, ${notifications_enabled}, ${notification_times})
      `;
    } else {
      // Update existing settings
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (notifications_enabled !== undefined) {
        updates.push(`notifications_enabled = $${paramIndex++}`);
        values.push(notifications_enabled);
      }

      if (notification_times !== undefined) {
        updates.push(`notification_times = $${paramIndex++}`);
        values.push(notification_times);
      }

      if (updates.length > 0) {
        values.push(userId);
        const query = `
          UPDATE user_settings 
          SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${paramIndex}
        `;
        await sql(query, values);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return Response.json(
      { error: "Failed to update notification settings" },
      { status: 500 },
    );
  }
}
