import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

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

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(
      `[API user-bottles POST ${timestamp}] ========== SAVE BOTTLES REQUEST START ==========`,
    );

    // Step 1: Authenticate user
    console.log(
      `[API user-bottles POST ${timestamp}] Step 1: Authenticating user...`,
    );
    const userId = await getUserId(request);

    if (!userId) {
      console.log(
        `[API user-bottles POST ${timestamp}] ❌ Step 1 FAILED: Unauthorized`,
      );
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(
      `[API user-bottles POST ${timestamp}] ✅ Step 1: User authenticated`,
      { userId },
    );

    // Step 2: Parse request body
    console.log(
      `[API user-bottles POST ${timestamp}] Step 2: Parsing request body...`,
    );
    let bottles;
    try {
      const body = await request.json();
      bottles = body.bottles;
      console.log(
        `[API user-bottles POST ${timestamp}] ✅ Step 2: Body parsed`,
        {
          hasBottles: !!bottles,
          isArray: Array.isArray(bottles),
          bottleCount: Array.isArray(bottles) ? bottles.length : 0,
        },
      );
    } catch (parseError) {
      console.error(
        `[API user-bottles POST ${timestamp}] ❌ Step 2 FAILED: JSON parse error`,
        {
          name: parseError.name,
          message: parseError.message,
        },
      );
      return Response.json(
        {
          error: "Invalid request body - must be valid JSON",
          errorDetails: {
            type: parseError.constructor?.name,
            message: parseError.message,
          },
        },
        { status: 400 },
      );
    }

    // Step 3: Validate bottles data
    if (!bottles || !Array.isArray(bottles)) {
      console.log(
        `[API user-bottles POST ${timestamp}] ❌ Step 3 FAILED: Invalid bottles data`,
        {
          hasBottles: !!bottles,
          isArray: Array.isArray(bottles),
        },
      );
      return Response.json(
        { error: "Invalid bottles data - must be an array" },
        { status: 400 },
      );
    }
    console.log(
      `[API user-bottles POST ${timestamp}] ✅ Step 3: Bottles data validated`,
      {
        bottleCount: bottles.length,
      },
    );

    // Step 4: Insert bottles into database
    console.log(
      `[API user-bottles POST ${timestamp}] Step 4: Inserting ${bottles.length} bottles...`,
    );
    let insertedCount = 0;

    try {
      for (const bottle of bottles) {
        console.log(
          `[API user-bottles POST ${timestamp}] Inserting bottle ${insertedCount + 1}/${bottles.length}`,
          {
            hasImageUrl: !!bottle.imageUrl,
            ounces: bottle.ounces,
          },
        );

        await sql`
          INSERT INTO user_bottles (user_id, image_url, ounces)
          VALUES (${userId}, ${bottle.imageUrl}, ${bottle.ounces})
        `;
        insertedCount++;
      }
      console.log(
        `[API user-bottles POST ${timestamp}] ✅ Step 4: All bottles inserted successfully`,
        {
          insertedCount,
        },
      );
    } catch (dbError) {
      console.error(
        `[API user-bottles POST ${timestamp}] ❌ Step 4 FAILED: Database error`,
        {
          name: dbError.name,
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          insertedSoFar: insertedCount,
        },
      );

      return Response.json(
        {
          error: `Database error while saving bottles: ${dbError.message}`,
          errorDetails: {
            type: dbError.constructor?.name,
            name: dbError.name,
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            insertedCount,
          },
        },
        { status: 500 },
      );
    }

    console.log(
      `[API user-bottles POST ${timestamp}] ========== SAVE BOTTLES REQUEST END ==========`,
    );
    return Response.json({ success: true, savedCount: insertedCount });
  } catch (error) {
    console.error(
      `[API user-bottles POST ${timestamp}] ❌❌❌ UNEXPECTED ERROR`,
    );
    console.error(
      `[API user-bottles POST ${timestamp}] Error type:`,
      typeof error,
    );
    console.error(
      `[API user-bottles POST ${timestamp}] Error name:`,
      error?.name,
    );
    console.error(
      `[API user-bottles POST ${timestamp}] Error message:`,
      error?.message,
    );
    console.error(
      `[API user-bottles POST ${timestamp}] Error stack:`,
      error?.stack,
    );

    const errorDetails = {
      type: error?.constructor?.name || typeof error,
      name: error?.name || "Unknown",
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack?.substring(0, 500),
    };

    return Response.json(
      {
        error: `USER_BOTTLES ERROR: ${errorDetails.message}`,
        errorDetails: errorDetails,
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  const userId = await getUserId(request);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bottles = await sql`
      SELECT id, image_url, ounces, created_at
      FROM user_bottles
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return Response.json({ bottles });
  } catch (error) {
    console.error("Error fetching user bottles:", error);
    return Response.json({ error: "Failed to fetch bottles" }, { status: 500 });
  }
}
