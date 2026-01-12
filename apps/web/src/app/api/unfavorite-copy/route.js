/**
 * API endpoint to unfavorite an entry that was created from a favorite
 * This finds the original favorite and unfavorites it
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

export async function POST(request) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { copyEntryId } = body;

    if (!copyEntryId) {
      return Response.json({ error: "Missing copyEntryId" }, { status: 400 });
    }

    // Get the copy entry details
    const copyEntry = await sql`
      SELECT ounces, classification, description, liquid_type, servings, created_from_favorite
      FROM water_entries
      WHERE id = ${copyEntryId}
        AND user_id = ${userId}
        AND is_deleted = false
      LIMIT 1
    `;

    if (copyEntry.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = copyEntry[0];

    // Verify this is actually a copy from a favorite
    if (!entry.created_from_favorite) {
      return Response.json(
        { error: "This entry was not created from a favorite" },
        { status: 400 },
      );
    }

    // Find the original favorite by matching key fields
    const originalFavorite = await sql`
      SELECT id
      FROM water_entries
      WHERE user_id = ${userId}
        AND is_favorited = true
        AND is_deleted = false
        AND ounces = ${entry.ounces}
        AND classification = ${entry.classification}
        AND COALESCE(description, '') = COALESCE(${entry.description}, '')
        AND COALESCE(liquid_type, 'water') = COALESCE(${entry.liquid_type}, 'water')
        AND COALESCE(servings, 1) = COALESCE(${entry.servings}, 1)
      ORDER BY favorite_order ASC NULLS LAST, timestamp DESC
      LIMIT 1
    `;

    if (originalFavorite.length === 0) {
      return Response.json(
        { error: "Original favorite not found" },
        { status: 404 },
      );
    }

    // Unfavorite the original
    await sql`
      UPDATE water_entries
      SET is_favorited = false,
          favorite_order = NULL
      WHERE id = ${originalFavorite[0].id}
        AND user_id = ${userId}
    `;

    return Response.json({
      success: true,
      unfavoritedId: originalFavorite[0].id,
    });
  } catch (error) {
    console.error("Error unfavoriting copy:", error);
    return Response.json(
      { error: "Failed to unfavorite copy" },
      { status: 500 },
    );
  }
}
