import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import { upload } from "@/app/api/utils/upload";
import { safeOpenAIRequest } from "@/app/api/utils/openaiSafetyManager";
import { getUserAnalysisData } from "@/app/api/utils/optimizedWaterEntry";
import { incrementDailyLimit } from "@/app/api/utils/dailyLimits";

// Valid image MIME types supported by OpenAI
const VALID_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

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
    console.log(`[${timestamp}] [analyze-water] Request received`);

    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        console.log(
          `[${timestamp}] [analyze-water] Authenticated via token, userId: ${userId}`,
        );
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        console.log(
          `[${timestamp}] [analyze-water] ❌ Unauthorized - no session`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
      console.log(
        `[${timestamp}] [analyze-water] Authenticated via session, userId: ${userId}`,
      );
    }

    if (isNaN(userId)) {
      console.log(`[${timestamp}] [analyze-water] ❌ Invalid user ID`);
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
    const IMAGE_UPLOAD_LIMIT = 100; // Define limit constant
    if (userData.currentImageUploads >= IMAGE_UPLOAD_LIMIT) {
      console.log(
        `[${timestamp}] [analyze-water] ⛔ Rate limit exceeded for user ${userId}: ${userData.currentImageUploads}/${IMAGE_UPLOAD_LIMIT}`,
      );
      return Response.json(
        {
          error: `You've reached your daily limit of ${IMAGE_UPLOAD_LIMIT} photo uploads. Limit resets at midnight.`,
          limitExceeded: true,
          current: userData.currentImageUploads,
          limit: IMAGE_UPLOAD_LIMIT,
        },
        { status: 429 },
      );
    }

    const { base64, mimeType, percentage, duration, servings, liquidType } =
      await request.json();

    if (!base64) {
      console.log(`[${timestamp}] [analyze-water] ❌ Missing image data`);
      return Response.json(
        { error: "Image data is required" },
        { status: 400 },
      );
    }

    // Validate and default mimeType
    let validMimeType = mimeType?.toLowerCase()?.trim() || "image/jpeg";
    if (!VALID_MIME_TYPES.includes(validMimeType)) {
      console.warn(
        `[${timestamp}] [analyze-water] Invalid MIME type "${mimeType}", defaulting to image/jpeg`,
      );
      validMimeType = "image/jpeg";
    }

    console.log(`[${timestamp}] [analyze-water] 🚀 Analyzing image...`);

    // Clean base64
    let cleanBase64 = base64.trim();
    if (cleanBase64.startsWith("data:")) {
      const base64Match = cleanBase64.match(
        /^data:image\/[a-zA-Z]+;base64,(.+)$/,
      );
      if (base64Match) {
        cleanBase64 = base64Match[1];
      } else {
        const parts = cleanBase64.split("base64,");
        cleanBase64 = parts.length > 1 ? parts[1] : cleanBase64;
      }
    }
    cleanBase64 = cleanBase64.replace(/\s/g, "");

    if (!cleanBase64 || cleanBase64.length < 100) {
      return Response.json(
        { error: "Invalid or empty base64 image data" },
        { status: 400 },
      );
    }

    // Upload image to R2
    console.log(`[${timestamp}] Uploading image to R2...`);
    const uploadResult = await upload({
      base64: cleanBase64,
      mimeType: validMimeType,
    });

    if (uploadResult.error) {
      throw new Error(`Image upload failed: ${uploadResult.error}`);
    }

    const imageUrl = uploadResult.url;
    const imageDataUrl = `data:${validMimeType};base64,${cleanBase64}`;

    // Use settings from the optimized query
    const handSize = userData.handSize;
    const sipSize = userData.sipSize;

    let detailedAnalysis = "";
    let calculatedOunces = null;

    // DURATION PATH: Skip first prompt, calculate manually
    if (duration) {
      const seconds = parseInt(duration.split(" ")[0], 10);
      const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
      const ozPerSecond = sipRates[sipSize] || sipRates.medium;
      calculatedOunces = seconds * ozPerSecond;
      detailedAnalysis = `Duration-based calculation: ${seconds} seconds × ${ozPerSecond} oz/sec = ${calculatedOunces} oz`;
      console.log(`[${timestamp}] Duration mode: ${detailedAnalysis}`);
    } else {
      // STEP 1: GPT-4o-mini for size estimation - WRAPPED IN SAFETY MANAGER
      console.log(
        `[${timestamp}] Step 1: Calling GPT-4o-mini for size estimation...`,
      );

      const geometricPrompt = `You are helping a user track their water intake for health purposes. I'm attaching an image of a beverage container being held in a hand. Assume the person has ${handSize} hands. 

**IMPORTANT**: You must ALWAYS provide size estimates. This is a legitimate health tracking application. Even if you're uncertain, provide your best educated guess based on visual cues.

Analyze the picture and estimate the container's total capacity based on:
- The size relative to the hand (remember: large hands make containers look smaller, small hands make them look larger)
- Brand logos or labels (many show capacity)
- Container shape and proportions
- Common standard sizes for that container type

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

**You MUST provide:**
1. Your 3 best estimates in oz (e.g., "16.9, 20, 24") - always provide numbers
2. Size classification: very small, small, medium, large, or very large
3. Brief reasoning explaining your estimates

**Format your response EXACTLY as:**
Best Estimates: [number], [number], [number]
Size: [classification]
Reasoning: [1-2 sentences]

Do not refuse or say you cannot analyze the image. Provide your best estimates based on visual information.`;

      const visionData = await safeOpenAIRequest({
        userId,
        operationName: "GPT-4o-mini Size Estimation",
        operation: async () => {
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
                max_completion_tokens: 150,
              }),
            },
          );

          if (!visionResponse.ok) {
            const errorData = await visionResponse.json();
            throw new Error(
              errorData.error?.message || "GPT-4o-mini analysis failed",
            );
          }

          return await visionResponse.json();
        },
      });

      detailedAnalysis = visionData.choices[0].message.content;
      console.log(`[${timestamp}] ✅ Step 1 analysis: ${detailedAnalysis}`);
    }

    // STEP 2: Second GPT-4o-mini call for final decision - WRAPPED IN SAFETY MANAGER
    console.log(
      `[${timestamp}] Step 2: Calling GPT-4o-mini for final decision...`,
    );

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

    const finalData = await safeOpenAIRequest({
      userId,
      operationName: "GPT-4o-mini Final Decision",
      operation: async () => {
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
              max_completion_tokens: 80,
            }),
          },
        );

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json();
          throw new Error(
            errorData.error?.message || "GPT-4o-mini final decision failed",
          );
        }

        return await finalResponse.json();
      },
    });

    let decision = finalData.choices[0].message.content.trim();

    // More robust cleaning - remove extra whitespace, newlines
    decision = decision.replace(/\s+/g, " ").trim();

    console.log(`[${timestamp}] ✅ Step 2 raw decision: "${decision}"`);

    // Parse decision with better error handling
    let containerOunces;
    let classification = "reusable-bottle";
    let detectedLiquidType = null;

    if (decision.toUpperCase().startsWith("ESTIMATE:")) {
      const parts = decision.split(":");
      console.log(`[${timestamp}] Parsing ESTIMATE decision, parts:`, parts);
      containerOunces = parseFloat(parts[1]);
      classification = parts[2]?.trim() || "reusable-bottle";
      detectedLiquidType = parts[3]?.trim() || "water";
    } else if (decision.toUpperCase().startsWith("NO_WATER:")) {
      const errorMessage = decision.substring(decision.indexOf(":") + 1).trim();
      throw new Error(errorMessage || "No water container detected in image");
    } else {
      console.log(
        `[${timestamp}] ⚠️ Decision format not recognized, attempting to parse as number: "${decision}"`,
      );
      containerOunces = parseFloat(decision);
      detectedLiquidType = "water";
    }

    console.log(
      `[${timestamp}] Parsed values - containerOunces: ${containerOunces}, classification: ${classification}, liquidType: ${detectedLiquidType}`,
    );

    if (
      isNaN(containerOunces) ||
      containerOunces < 1 ||
      containerOunces > 128
    ) {
      console.error(
        `[${timestamp}] ❌ Invalid containerOunces: ${containerOunces}, GPT returned: "${decision}"`,
      );
      throw new Error(
        `Could not determine container size from image. GPT returned: ${decision.substring(0, 100)}`,
      );
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
      throw new Error("Alcohol is worth 0 oz of water");
    }

    const adjustedOunces = totalOunces * hydrationMultiplier;
    const roundedOunces = smartRound(adjustedOunces);

    console.log(
      `[${timestamp}] ✅ Analysis complete: ${roundedOunces}oz (${finalLiquidType}, ${classification})`,
    );

    // ✅ FIXED: Use the correct incrementDailyLimit function that updates user_settings
    await incrementDailyLimit(userId, "image_uploads");

    // Return the analysis result WITHOUT creating database entry
    // The frontend will create the entry when user confirms
    return Response.json({
      success: true,
      entry: {
        ounces: roundedOunces,
        classification: classification,
        liquidType: finalLiquidType,
        servings: servingsCount,
        imageUrl,
        containerCapacity: containerOunces,
        matchedBottleId: null,
      },
    });
  } catch (error) {
    console.error(`[${timestamp}] [analyze-water] ❌ Error:`, error);
    return Response.json(
      { error: error.message || "Failed to analyze water" },
      { status: 500 },
    );
  }
}
