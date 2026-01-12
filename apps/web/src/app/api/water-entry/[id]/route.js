import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { invalidateUserCaches } from "@/app/api/utils/cache";
import { deleteWaterEntryWithAggregates } from "@/app/api/utils/optimizedWaterEntry";

// Helper: Smart rounding to nearest 0.5 or 1
function smartRound(value) {
  const whole = Math.floor(value);
  const decimal = value - whole;

  if (decimal >= 0.75) {
    return whole + 1;
  } else if (decimal >= 0.25) {
    return whole + 0.5;
  } else {
    return whole;
  }
}

// Helper: Calculate hydration percentage based on liquid type
function getHydrationPercentage(liquidType) {
  if (!liquidType) return 1.0;
  const type = liquidType.toLowerCase().trim();

  if (
    type.includes("water") ||
    type.includes("sparkling") ||
    type.includes("seltzer")
  )
    return 1.0;

  if ((type.includes("diet") || type.includes("zero")) && type.includes("soda"))
    return 0.9;

  if (type.includes("soda") || type.includes("coke") || type.includes("pepsi"))
    return 0.75;

  if (type.includes("gatorade") || type.includes("powerade")) return 0.7;
  if (type.includes("energy") || type.includes("red bull")) return 0.65;
  if (type.includes("coffee") || type.includes("tea")) return 0.8;
  if (type.includes("milk") || type.includes("dairy")) return 0.75;
  if (type.includes("juice")) return 0.7;
  if (type.includes("smoothie") || type.includes("protein")) return 0.65;
  if (
    type.includes("beer") ||
    type.includes("wine") ||
    type.includes("alcohol")
  )
    return 0.0;

  return 1.0;
}

export async function GET(request, { params }) {
  try {
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
    }

    // CLEANUP: Delete abandoned pending/processing entries older than 5 minutes
    // This prevents storage bloat from base64 images in the description field
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await sql`
      DELETE FROM water_entries 
      WHERE user_id = ${userId} 
      AND processing_status IN ('pending', 'processing')
      AND timestamp < ${fiveMinutesAgo}
    `;

    const { id } = params;

    // Fetch the entry
    const entries = await sql`
      SELECT * FROM water_entries 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (entries.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = entries[0];

    // If already complete, return it
    if (entry.processing_status === "complete") {
      return Response.json({
        status: "complete",
        entry: {
          id: entry.id,
          ounces: parseFloat(entry.ounces),
          classification: entry.classification,
          liquidType: entry.liquid_type,
          timestamp: entry.timestamp,
        },
      });
    }

    // If currently being processed by another request, return pending
    if (entry.processing_status === "processing") {
      return Response.json({
        status: "processing",
        message: "Analysis in progress, please wait...",
      });
    }

    // If processing failed, delete the entry and return error
    if (entry.processing_status === "error") {
      await sql`DELETE FROM water_entries WHERE id = ${id} AND user_id = ${userId}`;
      return Response.json(
        {
          error: "Processing failed. Please try again.",
          processingError: true,
        },
        { status: 400 },
      );
    }

    // If pending, process it now
    if (entry.processing_status === "pending") {
      // Mark as processing to prevent race conditions - use RETURNING to verify we got the lock
      const updateResult = await sql`
        UPDATE water_entries 
        SET processing_status = 'processing' 
        WHERE id = ${id} AND user_id = ${userId} AND processing_status = 'pending'
        RETURNING id
      `;

      // If no rows were updated, another request is already processing this entry
      if (updateResult.length === 0) {
        return Response.json({
          status: "processing",
          message: "Analysis already in progress...",
        });
      }

      // Extract metadata from description
      let metadata;
      try {
        metadata = JSON.parse(entry.description);
      } catch (e) {
        await sql`
          UPDATE water_entries 
          SET processing_status = 'error' 
          WHERE id = ${id}
        `;
        return Response.json(
          { error: "Invalid entry metadata" },
          { status: 400 },
        );
      }

      const { base64, mimeType, percentage, duration, servings, liquidType } =
        metadata;

      // Run the GPT analysis (same logic as analyze-water route)
      try {
        const imageDataUrl = `data:${mimeType};base64,${base64}`;

        // Fetch user settings
        const settingsRows = await sql`
          SELECT hand_size, sip_size FROM user_settings WHERE user_id = ${userId}
        `;
        const handSize = settingsRows[0]?.hand_size || "medium";
        const sipSize = settingsRows[0]?.sip_size || "medium";

        let detailedAnalysis = "";
        let calculatedOunces = null;

        // DURATION PATH: Skip first prompt, calculate manually
        if (duration) {
          const seconds = parseInt(duration.split(" ")[0], 10);
          const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
          const ozPerSecond = sipRates[sipSize] || sipRates.medium;
          calculatedOunces = seconds * ozPerSecond;
          detailedAnalysis = `Duration-based calculation: ${seconds} seconds × ${ozPerSecond} oz/sec = ${calculatedOunces} oz (${sipSize} sip size)`;
        } else {
          // PERCENTAGE/DEFAULT PATH: Use original two-step GPT process
          const geometricPrompt = `I'm attaching an image of a cup being held in a hand. Assume the person has ${handSize} hands. Please analyze the picture and estimate the cup's total capacity.

Keep in mind:
- Large hands make the bottle look smaller than it actually is
- Medium hands show the bottle at its normal size
- Small hands make the bottle look larger than it actually is

Choose from these standard sizes:

**Small cups / samples**
- 1 oz – shot / medicine cup
- 2 oz – espresso cup
- 3 oz – sample cup
- 4 oz – toddler cup
- 5 oz – wine pour
- 6 oz – teacup
- 7 oz – small coffee
- 8 oz – 1 cup

**Regular cups & mugs**
- 9 oz – small mug
- 10 oz – coffee cup
- 11 oz – mug
- 12 oz – soda can / mug
- 14 oz – large mug
- 15 oz – oversized mug
- 16 oz – pint

**Bottled drinks (single-serve)**
- 16.9 oz – 500 mL water bottle
- 18 oz – sports bottle
- 20 oz – soda bottle
- 22 oz – bike bottle
- 24 oz – large sports bottle

**Large reusable bottles (metric included)**
- 28 oz – hydration bottle
- 30 oz – tumbler
- 32 oz – 1 quart
- 33.8 oz – 1 liter (1 L)
- 36 oz – extra-large reusable
- 40 oz – large tumbler
- 50.7 oz – 1.5 liters (1.5 L)

**Extra-large / jug sizes**
- 48 oz – large bottle
- 64 oz – half gallon
- 73–75 oz – 2.2 L gym bottle
- 80 oz – hydration jug
- 96 oz – 3 quarts
- 128 oz – 1 gallon

Provide:
1. Your 3 best estimates (in oz, e.g., "16.9, 20, 24")
2. Size classification: very small, small, medium, large, or very large
3. Brief reasoning

Format your response as:
Best Estimates: [number], [number], [number]
Size: [classification]
Reasoning: [1-2 sentences]`;

          const visionResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: geometricPrompt },
                      { type: "image_url", image_url: { url: imageDataUrl } },
                    ],
                  },
                ],
                max_completion_tokens: 200,
              }),
            },
          );

          if (!visionResponse.ok) {
            const errorData = await visionResponse.json();
            throw new Error(
              errorData.error?.message || "GPT-4o-mini analysis failed",
            );
          }

          const visionData = await visionResponse.json();
          detailedAnalysis = visionData.choices[0].message.content;
        }

        // STEP 2: Second GPT-4o-mini call
        let finalPrompt = "";

        if (duration) {
          finalPrompt = `Review this image. Based on the user's sip size and drinking duration, the calculated amount consumed is ${calculatedOunces.toFixed(1)} oz. This is the correct amount.

You must choose ONE of two options:

**OPTION 1: Classify the container**
If the image shows a valid water bottle, cup, or water source, classify both the water source AND the liquid type. Respond with:
ESTIMATE:${calculatedOunces.toFixed(1)}:[classification]:[liquid_type]

For example: ESTIMATE:${calculatedOunces.toFixed(1)}:disposable-bottle:diet soda

`;
        } else {
          finalPrompt = `Review this image and the analysis below. You must choose ONE of two options:

Analysis from first pass:
${detailedAnalysis}

**OPTION 1: Pick best estimate**
If the image shows a valid water bottle, cup, or water source, pick the single best capacity estimate from the three estimates in the analysis above AND classify both the water source AND the liquid type. Respond with:
ESTIMATE:[number]:[classification]:[liquid_type]

For example: ESTIMATE:16.9:disposable-bottle:diet soda

`;
        }

        finalPrompt += `Classification options:
- reusable-bottle (Hydro Flask, Stanley, ThermoFlask, etc.)
- disposable-bottle (plastic water bottles, single-use bottles)
- disposable-can (soda cans, energy drink cans, beer cans, aluminum cans)
- Cup/Glass (cups at home, office cups, restaurant glasses)
- water-fountain (school, gym, public fountains)
- faucet-tap (sink at home, bathroom, kitchen, hose)
- filtered-dispenser (Brita pitcher, fridge dispenser, water cooler)

Liquid type detection:
Look at the label, brand, and any visible text to determine what's in the container. Choose from:
- water (plain water, sparkling water, seltzer)
- diet soda (Diet Coke, Coke Zero, Diet Pepsi, etc.)
- soda (Coke, Pepsi, Sprite, Fanta, etc.)
- sports drink (Gatorade, Powerade)
- energy drink (Red Bull, Monster, Bang)
- coffee (coffee, espresso, latte, cappuccino)
- tea (black tea, green tea, herbal tea)
- milk (milk, dairy drinks)
- juice (orange juice, apple juice, etc.)
- smoothie (smoothies, protein shakes)
- alcohol (beer, wine, cocktails)

**IMPORTANT**: If the liquid is clear or no liquid is visible inside the container, assume it is water.

If you cannot determine the liquid type from the label or branding, use "water" as default.

**OPTION 2: No source of liquid found**
If the image does NOT contain any liquid container, cup, glass, or liquid source, respond with:
NO_WATER:Could not detect a liquid container or liquid source in this image. Please try again with a clear photo of your liquid container.

Respond with ONLY one of the formats above. Nothing else.`;

        const finalContent = [
          { type: "text", text: finalPrompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ];

        const finalResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: finalContent }],
              max_completion_tokens: 100,
            }),
          },
        );

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json();
          throw new Error(
            errorData.error?.message || "GPT-4o-mini analysis failed",
          );
        }

        const finalData = await finalResponse.json();
        const decision = finalData.choices[0].message.content.trim();

        // Parse decision
        let containerOunces;
        let classification = "reusable-bottle";
        let detectedLiquidType = null;

        if (decision.startsWith("ESTIMATE:")) {
          const parts = decision.split(":");
          containerOunces = parseFloat(parts[1]);
          classification = parts[2] || "reusable-bottle";
          detectedLiquidType = parts[3] || "water";
        } else if (decision.startsWith("NO_WATER:")) {
          const errorMessage = decision.substring("NO_WATER:".length).trim();
          // Delete the entry and return error
          await sql`DELETE FROM water_entries WHERE id = ${id}`;
          return Response.json(
            {
              error: errorMessage,
              noWaterDetected: true,
            },
            { status: 400 },
          );
        } else {
          containerOunces = parseFloat(decision);
          detectedLiquidType = "water";
        }

        if (
          isNaN(containerOunces) ||
          containerOunces < 1 ||
          containerOunces > 128
        ) {
          containerOunces = 16;
        }

        containerOunces = Math.round(containerOunces * 2) / 2;

        // Calculate consumed amount
        let consumedOunces;
        if (duration) {
          consumedOunces = calculatedOunces;
        } else if (percentage) {
          consumedOunces = (containerOunces * percentage) / 100;
        } else {
          consumedOunces = containerOunces;
        }

        consumedOunces = Math.round(consumedOunces * 2) / 2;
        consumedOunces = Math.max(0.5, Math.min(consumedOunces, 128));

        const servingsCount = servings || 1;
        const totalOunces = consumedOunces * servingsCount;
        const finalLiquidType = liquidType || detectedLiquidType || "water";

        // Apply hydration multiplier
        const hydrationMultiplier = getHydrationPercentage(finalLiquidType);

        if (hydrationMultiplier === 0) {
          // Delete the entry and return error
          await sql`DELETE FROM water_entries WHERE id = ${id}`;
          return Response.json(
            {
              error: "Alcohol is worth 0 oz of water",
              isAlcohol: true,
              liquidType: finalLiquidType,
            },
            { status: 400 },
          );
        }

        const adjustedOunces = totalOunces * hydrationMultiplier;
        const roundedOunces = smartRound(adjustedOunces);

        // Update the entry with final values
        await sql`
          UPDATE water_entries
          SET 
            ounces = ${roundedOunces},
            classification = ${classification},
            liquid_type = ${finalLiquidType},
            processing_status = 'complete',
            description = NULL
          WHERE id = ${id} AND user_id = ${userId}
        `;

        // Invalidate user's caches
        invalidateUserCaches(userId);

        return Response.json({
          status: "complete",
          entry: {
            id: parseInt(id),
            ounces: roundedOunces,
            containerCapacity: containerOunces,
            classification,
            liquidType: finalLiquidType,
            matchedBottleId: null,
            timestamp: entry.timestamp,
          },
        });
      } catch (error) {
        console.error("Error processing water entry:", error);
        // Mark as error
        await sql`
          UPDATE water_entries 
          SET processing_status = 'error' 
          WHERE id = ${id}
        `;
        return Response.json(
          {
            error: "Failed to process water entry",
            details: error.message,
          },
          { status: 500 },
        );
      }
    }

    // Unknown status
    return Response.json(
      { error: "Unknown processing status" },
      { status: 500 },
    );
  } catch (error) {
    console.error("Error fetching water entry:", error);
    return Response.json(
      { error: "Failed to fetch entry", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  const requestId = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();

  console.log(
    `[DELETE ${requestId}] ========== DELETE REQUEST START ==========`,
  );
  console.log(`[DELETE ${requestId}] Timestamp: ${timestamp}`);
  console.log(`[DELETE ${requestId}] Entry ID from params:`, params.id);

  try {
    // Log all request headers (excluding sensitive data)
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() === "authorization") {
        headers[key] = value
          ? `Bearer ${value.substring(7, 27)}...`
          : "NOT SET";
      } else {
        headers[key] = value;
      }
    });
    console.log(`[DELETE ${requestId}] Request headers:`, headers);

    const token = getTokenFromRequest(request);
    let userId = null;
    let authMethod = null;

    if (token) {
      console.log(`[DELETE ${requestId}] Found JWT token, validating...`);
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        authMethod = "JWT";
        console.log(
          `[DELETE ${requestId}] ✅ JWT validated - User ID: ${userId}`,
        );
      } else {
        console.log(`[DELETE ${requestId}] ❌ JWT validation failed`);
      }
    }

    if (!userId) {
      console.log(
        `[DELETE ${requestId}] No JWT or JWT invalid, trying session auth...`,
      );
      const session = await auth();
      if (!session?.user?.id) {
        console.log(`[DELETE ${requestId}] ❌ No session found - UNAUTHORIZED`);
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
      authMethod = "Session";
      console.log(
        `[DELETE ${requestId}] ✅ Session validated - User ID: ${userId}`,
      );
    }

    const { id } = params;
    console.log(`[DELETE ${requestId}] Auth method: ${authMethod}`);
    console.log(`[DELETE ${requestId}] User ID: ${userId}`);
    console.log(`[DELETE ${requestId}] Entry ID: ${id}`);
    console.log(
      `[DELETE ${requestId}] Executing optimized delete transaction...`,
    );

    // 🚀 OPTIMIZED: Single transaction does everything
    const deletedEntry = await deleteWaterEntryWithAggregates(userId, id);

    if (!deletedEntry) {
      console.log(
        `[DELETE ${requestId}] ❌ No entry found or user ${userId} unauthorized`,
      );

      // Verify if entry exists at all
      const checkEntry =
        await sql`SELECT id, user_id, is_deleted FROM water_entries WHERE id = ${id}`;
      console.log(
        `[DELETE ${requestId}] Entry exists check:`,
        checkEntry.length > 0
          ? `Entry exists - user_id: ${checkEntry[0].user_id}, is_deleted: ${checkEntry[0].is_deleted}`
          : "Entry does not exist",
      );

      return Response.json(
        { error: "Entry not found or unauthorized" },
        { status: 404 },
      );
    }

    console.log(
      `[DELETE ${requestId}] ✅ Optimized delete transaction successful:`,
      {
        id: deletedEntry.id,
        entry_date: deletedEntry.entry_date,
        ounces: deletedEntry.ounces,
        new_daily_total: deletedEntry.new_daily_total,
      },
    );

    // IMMEDIATE VERIFICATION: Query the entry again to confirm it's marked as deleted
    console.log(`[DELETE ${requestId}] Verifying deletion...`);
    const verifyResult = await sql`
      SELECT id, is_deleted FROM water_entries WHERE id = ${id}
    `;

    if (verifyResult.length > 0) {
      console.log(`[DELETE ${requestId}] Verification result:`, {
        id: verifyResult[0].id,
        is_deleted: verifyResult[0].is_deleted,
        expected_is_deleted: true,
        match:
          verifyResult[0].is_deleted === true ? "✅ CONFIRMED" : "❌ MISMATCH",
      });
    } else {
      console.log(
        `[DELETE ${requestId}] ⚠️ Verification: Entry not found in DB (might have been hard deleted by another process)`,
      );
    }

    // Invalidate user's caches after successful deletion
    console.log(
      `[DELETE ${requestId}] Invalidating caches for user ${userId}...`,
    );
    invalidateUserCaches(userId);
    console.log(`[DELETE ${requestId}] Cache invalidated`);

    console.log(
      `[DELETE ${requestId}] ========== DELETE REQUEST END (SUCCESS) ==========`,
    );

    // Return success with entry_date so frontend knows which date to refresh
    return Response.json({
      success: true,
      id: parseInt(id),
      entry_date: deletedEntry.entry_date,
      deleted: true,
    });
  } catch (error) {
    console.error(`[DELETE ${requestId}] ❌❌❌ EXCEPTION OCCURRED ❌❌❌`);
    console.error(`[DELETE ${requestId}] Error type: ${error.name}`);
    console.error(`[DELETE ${requestId}] Error message: ${error.message}`);
    console.error(`[DELETE ${requestId}] Error stack:`, error.stack);
    console.log(
      `[DELETE ${requestId}] ========== DELETE REQUEST END (ERROR) ==========`,
    );

    return Response.json(
      {
        error: "Failed to delete entry",
        details: error.message,
        errorType: error.name,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Get the current entry first
    const currentEntry = await sql`
      SELECT * FROM water_entries 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (currentEntry.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = currentEntry[0];

    // Check if trying to favorite a manual entry
    if (body.is_favorited === true) {
      const isManualEntry =
        !entry.image_url && entry.classification !== "description";
      if (isManualEntry) {
        return Response.json(
          { error: "Manual entries cannot be favorited" },
          { status: 400 },
        );
      }

      // Check 25-favorite limit from the permanent favorites table
      const favoritesCount = await sql`
        SELECT COUNT(*) as count
        FROM user_favorites
        WHERE user_id = ${userId}
      `;

      const currentFavorites = parseInt(favoritesCount[0]?.count || 0);

      // If not currently favorited and trying to favorite, check limit
      if (!entry.is_favorited && currentFavorites >= 25) {
        return Response.json(
          {
            error:
              "You've reached the maximum of 25 favorited entries. Remove a favorite to add a new one.",
            favoritesLimitReached: true,
            currentFavorites,
            limit: 25,
          },
          { status: 429 },
        );
      }
    }

    // Prepare field updates
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (body.ounces !== undefined) {
      setClauses.push(`ounces = $${paramIndex++}`);
      values.push(parseFloat(body.ounces));
    }

    if (body.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }

    if (body.servings !== undefined) {
      setClauses.push(`servings = $${paramIndex++}`);
      values.push(parseInt(body.servings));
    }

    if (body.liquid_type !== undefined) {
      setClauses.push(`liquid_type = $${paramIndex++}`);
      values.push(body.liquid_type);
    }

    // Handle favorite toggling with permanent favorites table
    if (body.is_favorited !== undefined) {
      setClauses.push(`is_favorited = $${paramIndex++}`);
      values.push(body.is_favorited);

      // If favoriting for the first time, copy to user_favorites table
      if (body.is_favorited && !entry.is_favorited) {
        // Get the current max favorite_order for this user
        const maxOrderResult = await sql`
          SELECT COALESCE(MAX(favorite_order), 0) as max_order 
          FROM user_favorites
          WHERE user_id = ${userId}
        `;
        const nextOrder = (maxOrderResult[0]?.max_order || 0) + 1;

        // Insert into user_favorites table
        await sql`
          INSERT INTO user_favorites (
            user_id, ounces, image_url, classification,
            liquid_type, description, servings, favorite_order
          )
          VALUES (
            ${userId}, ${entry.ounces}, ${entry.image_url}, ${entry.classification},
            ${entry.liquid_type}, ${entry.description}, ${entry.servings}, ${nextOrder}
          )
        `;

        setClauses.push(`favorite_order = $${paramIndex++}`);
        values.push(nextOrder);
      } else if (!body.is_favorited && entry.is_favorited) {
        // If unfavoriting, remove from user_favorites table
        // Find the favorite entry that matches this water entry's properties
        await sql`
          DELETE FROM user_favorites
          WHERE user_id = ${userId} 
          AND favorite_order = ${entry.favorite_order}
        `;

        // Clear the favorite_order in water_entries
        setClauses.push(`favorite_order = $${paramIndex++}`);
        values.push(null);
      }
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    // Add WHERE clause parameters
    values.push(id);
    values.push(userId);

    // Build and execute the query
    const query = `
      UPDATE water_entries
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING id, ounces, description, servings, liquid_type, is_favorited, favorite_order
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    // Invalidate caches
    invalidateUserCaches(userId);

    return Response.json({ entry: result[0] });
  } catch (error) {
    console.error("Error updating water entry:", error);
    return Response.json(
      {
        error: "Failed to update entry",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

async function getUserId(request) {
  const token = getTokenFromRequest(request);
  let userId = null;

  if (token) {
    const user = await validateToken(token);
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }
    userId = parseInt(session.user.id, 10);
  }

  return userId;
}
