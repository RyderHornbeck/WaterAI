/**
 * Favorites API endpoint
 * GET - Get user's favorited water entries from permanent favorites table
 * POST - Add entry to favorites (creates a copy in user_favorites table)
 * DELETE - Remove entry from favorites
 */

import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

async function getUserId(request) {
  const token = getTokenFromRequest(request);

  if (token) {
    const user = await validateToken(token);
    if (user) {
      return user.id;
    }
  }

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

    // Get all favorites from permanent favorites table
    const favorites = await sql`
      SELECT 
        id,
        ounces,
        classification,
        image_url,
        description,
        servings,
        liquid_type,
        favorite_order,
        created_at
      FROM user_favorites
      WHERE user_id = ${userId}
      ORDER BY favorite_order ASC NULLS LAST, created_at DESC
    `;

    console.log(
      `[favorites] Found ${favorites.length} favorites for user ${userId}`,
    );

    return Response.json({ favorites });
  } catch (error) {
    console.error("[favorites] Error fetching favorites:", error);
    return Response.json(
      { error: "Failed to fetch favorites" },
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

    const body = await request.json();
    const { waterEntryId } = body;

    if (!waterEntryId) {
      return Response.json(
        { error: "Water entry ID required" },
        { status: 400 },
      );
    }

    // Get the water entry details
    const entries = await sql`
      SELECT 
        ounces,
        classification,
        image_url,
        description,
        servings,
        liquid_type
      FROM water_entries
      WHERE id = ${waterEntryId} AND user_id = ${userId} AND is_deleted = false
    `;

    if (entries.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = entries[0];

    // Get current max favorite_order for this user
    const maxOrderResult = await sql`
      SELECT MAX(favorite_order) as max_order
      FROM user_favorites
      WHERE user_id = ${userId}
    `;

    const nextOrder = (maxOrderResult[0]?.max_order || 0) + 1;

    // Insert into user_favorites table
    const favorite = await sql`
      INSERT INTO user_favorites (
        user_id, ounces, image_url, classification,
        liquid_type, description, servings, favorite_order
      )
      VALUES (
        ${userId}, ${entry.ounces}, ${entry.image_url}, ${entry.classification},
        ${entry.liquid_type}, ${entry.description}, ${entry.servings}, ${nextOrder}
      )
      RETURNING *
    `;

    // Also mark the original entry as favorited
    await sql`
      UPDATE water_entries
      SET is_favorited = true, favorite_order = ${nextOrder}
      WHERE id = ${waterEntryId} AND user_id = ${userId}
    `;

    console.log(
      `[favorites] Created favorite ${favorite[0].id} for user ${userId}`,
    );

    return Response.json({ favorite: favorite[0] });
  } catch (error) {
    console.error("[favorites] Error creating favorite:", error);
    return Response.json(
      { error: "Failed to create favorite" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const favoriteId = url.searchParams.get("id");

    if (!favoriteId) {
      return Response.json({ error: "Favorite ID required" }, { status: 400 });
    }

    // Delete from user_favorites
    await sql`
      DELETE FROM user_favorites
      WHERE id = ${favoriteId} AND user_id = ${userId}
    `;

    console.log(
      `[favorites] Deleted favorite ${favoriteId} for user ${userId}`,
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("[favorites] Error deleting favorite:", error);
    return Response.json(
      { error: "Failed to delete favorite" },
      { status: 500 },
    );
  }
}
