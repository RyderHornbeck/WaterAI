import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { safeOpenAIRequest } from "@/app/api/utils/openaiSafetyManager";
import { getUserAnalysisData } from "@/app/api/utils/optimizedWaterEntry";

// Helper: Smart rounding
function smartRound(value) {
  const whole = Math.floor(value);
  const decimal = value - whole;
  if (decimal >= 0.75) return whole + 1;
  if (decimal >= 0.25) return whole + 0.5;
  return whole;
}

// Helper: Hydration percentage
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

export async function POST(request) {
  const timestamp = Date.now();
  try {
    console.log(`[${timestamp}] [analyze-text] Request received`);

    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        console.log(
          `[${timestamp}] [analyze-text] Authenticated via token, userId: ${userId}`,
        );
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        console.log(
          `[${timestamp}] [analyze-text] ❌ Unauthorized - no session`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
      console.log(
        `[${timestamp}] [analyze-text] Authenticated via session, userId: ${userId}`,
      );
    }

    if (isNaN(userId)) {
      console.log(`[${timestamp}] [analyze-text] ❌ Invalid user ID`);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // 🚀 OPTIMIZED: Single read for all user data + limit check
    const userData = await getUserAnalysisData(userId);

    if (!userData) {
      return Response.json(
        { error: "User settings not found" },
        { status: 404 },
      );
    }

    // Check rate limiting from the combined query result
    const TEXT_DESCRIPTION_LIMIT = 20; // Changed from 100 to 20
    if (userData.currentTextDescriptions >= TEXT_DESCRIPTION_LIMIT) {
      console.log(
        `[${timestamp}] [analyze-text] ⛔ Rate limit exceeded for user ${userId}: ${userData.currentTextDescriptions}/${TEXT_DESCRIPTION_LIMIT}`,
      );
      return Response.json(
        {
          error: `You've reached your daily limit of ${TEXT_DESCRIPTION_LIMIT} text descriptions. Limit resets at midnight.`,
          limitExceeded: true,
          current: userData.currentTextDescriptions,
          limit: TEXT_DESCRIPTION_LIMIT,
        },
        { status: 429 },
      );
    }

    const { description } = await request.json();

    if (!description || !description.trim()) {
      console.log(`[${timestamp}] [analyze-text] ❌ Missing description`);
      return Response.json({ error: "Missing description" }, { status: 400 });
    }

    console.log(
      `[${timestamp}] [analyze-text] 🚀 Analyzing text description...`,
    );
    console.log(
      `[${timestamp}] [analyze-text] Description: "${description.trim()}"`,
    );

    // Analyze with GPT immediately - WRAPPED IN SAFETY MANAGER
    const chatData = await safeOpenAIRequest({
      userId,
      operationName: "GPT-4o Text Analysis",
      operation: async () => {
        const chatResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are a precise water intake estimation assistant. Analyze the description and:

1. Identify the container type and size
2. Determine the liquid type (water, soda, diet soda, sports drink, energy drink, coffee, tea, milk, juice, smoothie, alcohol)
3. Calculate the RAW ounces consumed (do NOT apply hydration percentages)

Standard sizes:

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

User's drinking style: ${userData.sipSize} (${userData.sipSize === "small" ? "0.4 oz/second" : userData.sipSize === "large" ? "0.85 oz/second" : "0.6 oz/second"})
- If they mention sips, gulps, or drinking duration, use this rate to estimate ounces
- Example: "10 seconds of drinking" with medium sips = 10 × 0.6 = 6oz

If no liquid type mentioned, assume water.

Format:
FINAL ANSWER: [ounces] oz | LIQUID: [type]

Example: "FINAL ANSWER: 12 oz | LIQUID: diet soda"`,
                },
                {
                  role: "user",
                  content: description.trim(),
                },
              ],
              max_tokens: 300,
            }),
          },
        );

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          throw new Error(
            `GPT text analysis failed: ${chatResponse.status} ${chatResponse.statusText}`,
          );
        }

        return await chatResponse.json();
      },
    });

    const content = chatData.choices[0].message.content;
    console.log(`[${timestamp}] ✅ GPT response: ${content}`);

    let ounces = 8;
    let liquidType = "water";

    const finalAnswerMatch = content.match(/FINAL ANSWER:\s*(\d+\.?\d*)\s*oz/i);
    if (finalAnswerMatch) {
      ounces = parseFloat(finalAnswerMatch[1]);
    }

    const liquidMatch = content.match(/LIQUID:\s*([^\n|]+?)(?:\s*\||$)/i);
    if (liquidMatch) {
      liquidType = liquidMatch[1].trim();
    }

    ounces = Math.round(parseFloat(ounces) * 10) / 10;

    const hydrationMultiplier = getHydrationPercentage(liquidType);

    if (hydrationMultiplier === 0) {
      throw new Error("Alcohol is worth 0 oz of water");
    }

    const adjustedOunces = ounces * hydrationMultiplier;
    const roundedOunces = smartRound(adjustedOunces);

    console.log(
      `[${timestamp}] ✅ Text analysis complete: ${roundedOunces}oz (${liquidType})`,
    );

    // NOTE: Limit increment will happen automatically when the entry is created
    // via createWaterEntryWithAggregates (classification === 'description')
    // No need to increment here - avoid double counting

    // Return the analysis result WITHOUT creating database entry
    // The frontend will create the entry when user confirms
    return Response.json({
      success: true,
      entry: {
        ounces: roundedOunces,
        classification: "description",
        liquidType: liquidType,
        servings: 1,
      },
    });
  } catch (error) {
    console.error(`[${timestamp}] [analyze-text] ❌ Error:`, error);
    return Response.json(
      { error: error.message || "Failed to analyze text description" },
      { status: 500 },
    );
  }
}
