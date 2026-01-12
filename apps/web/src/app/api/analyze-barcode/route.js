import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import {
  checkDailyLimit,
  incrementDailyLimit,
  getLimitErrorMessage,
} from "@/app/api/utils/dailyLimits";
import { upload } from "@/app/api/utils/upload";
import { safeOpenAIRequest } from "@/app/api/utils/openaiSafetyManager";
import crypto from "crypto";

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
    console.log(`[${timestamp}] [analyze-barcode] Request received`);

    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
        console.log(
          `[${timestamp}] [analyze-barcode] Authenticated via token, userId: ${userId}`,
        );
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        console.log(
          `[${timestamp}] [analyze-barcode] ❌ Unauthorized - no session`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
      console.log(
        `[${timestamp}] [analyze-barcode] Authenticated via session, userId: ${userId}`,
      );
    }

    if (isNaN(userId)) {
      console.log(`[${timestamp}] [analyze-barcode] ❌ Invalid user ID`);
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // 🔒 Check rate limiting BEFORE processing
    const limitCheck = await checkDailyLimit(userId, "image_uploads");
    if (!limitCheck.allowed) {
      const errorMsg = getLimitErrorMessage(
        "image_uploads",
        limitCheck.limit,
        limitCheck.resetTime,
      );
      console.log(
        `[${timestamp}] [analyze-barcode] ⛔ Rate limit exceeded for user ${userId}: ${limitCheck.current}/${limitCheck.limit}`,
      );
      return Response.json(
        {
          error: errorMsg,
          limitExceeded: true,
          current: limitCheck.current,
          limit: limitCheck.limit,
          resetTime: limitCheck.resetTime,
        },
        { status: 429 },
      );
    }

    const { base64, mimeType, percentage, duration, servings, liquidType } =
      await request.json();

    if (!base64) {
      console.log(`[${timestamp}] [analyze-barcode] ❌ Missing image data`);
      return Response.json(
        { error: "Image data is required" },
        { status: 400 },
      );
    }

    // Validate and default mimeType
    let validMimeType = mimeType?.toLowerCase()?.trim() || "image/jpeg";
    if (!VALID_MIME_TYPES.includes(validMimeType)) {
      console.warn(
        `[${timestamp}] [analyze-barcode] Invalid MIME type "${mimeType}", defaulting to image/jpeg`,
      );
      validMimeType = "image/jpeg";
    }

    console.log(`[${timestamp}] [analyze-barcode] 🚀 Analyzing barcode...`);

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

    // Upload image to R2 FIRST
    console.log(`[${timestamp}] Uploading barcode image to R2...`);
    const uploadResult = await upload({
      base64: cleanBase64,
      mimeType: validMimeType,
    });

    if (uploadResult.error) {
      throw new Error(`Image upload failed: ${uploadResult.error}`);
    }

    const imageUrl = uploadResult.url;
    console.log(`[${timestamp}] ✅ Image uploaded to: ${imageUrl}`);

    // Detect barcode using Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: "BARCODE_DETECTION", maxResults: 5 }],
            },
          ],
        }),
      },
    );

    if (!visionResponse.ok) {
      throw new Error("Barcode detection failed");
    }

    const visionData = await visionResponse.json();
    const annotations = visionData.responses[0]?.barcodeAnnotations;

    if (!annotations || annotations.length === 0) {
      throw new Error("No barcode found in image");
    }

    const barcode = annotations[0].description;
    console.log(`[${timestamp}] ✅ Barcode detected: ${barcode}`);

    // Check cache first
    const cachedResult = await sql`
      SELECT ounces, product_name, source
      FROM barcode_cache
      WHERE barcode = ${barcode}
      LIMIT 1
    `;

    let containerOunces;
    let productName = "Unknown Product";
    let detectedLiquidType = "water";

    if (cachedResult.length > 0) {
      containerOunces = parseFloat(cachedResult[0].ounces);
      productName = cachedResult[0].product_name;
      console.log(
        `[${timestamp}] ✅ Using cached result for barcode ${barcode}: ${containerOunces}oz, ${productName}`,
      );
    } else {
      // Analyze with GPT using the NEWLY UPLOADED image URL (not base64)
      console.log(`[${timestamp}] Analyzing barcode with GPT...`);
      const imageDataUrl = `data:${validMimeType};base64,${cleanBase64}`;

      const gptData = await safeOpenAIRequest({
        userId,
        operationName: "GPT-4o Barcode Analysis",
        operation: async () => {
          const gptResponse = await fetch(
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
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `Analyze this beverage container. Determine the INDIVIDUAL CONTAINER SIZE in fluid ounces.

CRITICAL: If you see multi-pack labels (e.g. "24 pack" or "12 cans"), return the PER-CONTAINER size, not the total.

Examples:
- "24 pack 16.9 fl oz" → 16.9 oz
- "12 cans 12 oz" → 12 oz

Also identify the liquid type: water, soda, diet soda, sports drink, energy drink, coffee, tea, milk, juice, smoothie, or alcohol.

Respond with:
OUNCES: [number]
LIQUID: [type]
PRODUCT: [product name]`,
                      },
                      { type: "image_url", image_url: { url: imageDataUrl } },
                    ],
                  },
                ],
                max_tokens: 200,
              }),
            },
          );

          if (!gptResponse.ok) {
            throw new Error("GPT analysis failed");
          }

          return await gptResponse.json();
        },
      });

      const content = gptData.choices[0].message.content;

      const ouncesMatch = content.match(/OUNCES:\s*(\d+\.?\d*)/i);
      containerOunces = ouncesMatch ? parseFloat(ouncesMatch[1]) : 16;

      const productMatch = content.match(/PRODUCT:\s*(.+?)(?:\n|$)/i);
      productName = productMatch ? productMatch[1].trim() : "Unknown Product";

      const liquidMatch = content.match(/LIQUID:\s*([^\n]+?)(?:\n|$)/i);
      detectedLiquidType = liquidMatch ? liquidMatch[1].trim() : "water";

      // Cache the result
      await sql`
        INSERT INTO barcode_cache (barcode, product_name, ounces, source)
        VALUES (${barcode}, ${productName}, ${containerOunces}, ${"GPT Vision"})
        ON CONFLICT (barcode) DO NOTHING
      `;
      console.log(
        `[${timestamp}] ✅ Cached barcode result: ${barcode} = ${containerOunces}oz`,
      );
    }

    // Get user settings
    const settingsRows = await sql`
      SELECT sip_size FROM user_settings WHERE user_id = ${userId}
    `;
    const sipSize = settingsRows[0]?.sip_size || "medium";

    let consumedOunces = containerOunces;

    if (percentage) {
      consumedOunces = (containerOunces * percentage) / 100;
    } else if (duration) {
      const seconds = parseInt(duration.split(" ")[0], 10);
      const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
      const ozPerSecond = sipRates[sipSize] || sipRates.medium;
      consumedOunces = seconds * ozPerSecond;
    }

    consumedOunces = Math.round(consumedOunces * 10) / 10;
    consumedOunces = Math.max(0.5, Math.min(consumedOunces, 128));

    const servingsCount = servings || 1;
    const totalOunces = consumedOunces * servingsCount;
    const finalLiquidType = liquidType || detectedLiquidType || "water";

    const hydrationMultiplier = getHydrationPercentage(finalLiquidType);

    if (hydrationMultiplier === 0) {
      throw new Error("Alcohol is worth 0 oz of water");
    }

    const adjustedOunces = totalOunces * hydrationMultiplier;
    const roundedOunces = smartRound(adjustedOunces);

    console.log(
      `[${timestamp}] ✅ Barcode analysis complete: ${roundedOunces}oz (${finalLiquidType})`,
    );

    // 📊 Increment the daily limit counter
    await incrementDailyLimit(userId, "image_uploads");

    // Return the analysis result WITHOUT creating database entry
    // The frontend will create the entry when user confirms
    return Response.json({
      success: true,
      entry: {
        ounces: roundedOunces,
        classification: "disposable-bottle",
        liquidType: finalLiquidType,
        servings: servingsCount,
        imageUrl,
        containerCapacity: containerOunces,
        productName,
        barcode,
      },
    });
  } catch (error) {
    console.error(`[${timestamp}] [analyze-barcode] ❌ Error:`, error);
    return Response.json(
      { error: error.message || "Failed to analyze barcode" },
      { status: 500 },
    );
  }
}
