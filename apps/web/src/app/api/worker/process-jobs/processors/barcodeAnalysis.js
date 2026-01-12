import sql from "@/app/api/utils/sql";
import { smartRound, getHydrationPercentage } from "../utils/hydration";
import {
  calculateDurationBasedConsumption,
  calculatePercentageBasedConsumption,
  calculateFinalOunces,
  validateOunces,
} from "../utils/consumption";
import { createWaterEntry } from "../utils/waterEntry";
import { callOpenAIWithRetry } from "@/app/api/utils/openaiWithRetry";

// Valid image MIME types supported by OpenAI
const VALID_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Processor for barcode analysis jobs
export async function processBarcodeAnalysisJob(job) {
  const jobId = job.id;
  console.log(`[Worker] [Job ${jobId}] Starting barcode analysis...`);

  const {
    userId,
    base64,
    mimeType,
    percentage,
    duration,
    servings,
    liquidType,
  } = job.payload;

  // Validate base64 exists
  if (!base64) {
    throw new Error("No image data provided");
  }

  // Clean base64 string - remove any existing data URL prefix
  let cleanBase64 = base64.trim();

  // If it already has a data URL prefix, extract just the base64 part
  if (cleanBase64.startsWith("data:")) {
    const base64Match = cleanBase64.match(
      /^data:image\/[a-zA-Z]+;base64,(.+)$/,
    );
    if (base64Match) {
      cleanBase64 = base64Match[1];
    } else {
      console.warn(
        `[Worker] [Job ${jobId}] Malformed data URL, attempting to extract base64...`,
      );
      // Try to extract everything after 'base64,'
      const parts = cleanBase64.split("base64,");
      cleanBase64 = parts.length > 1 ? parts[1] : cleanBase64;
    }
  }

  // Remove any whitespace/newlines that might have been added
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  // Validate base64 is not empty after cleaning
  if (!cleanBase64 || cleanBase64.length < 100) {
    throw new Error("Invalid or empty base64 image data");
  }

  // Validate and sanitize mimeType before using it
  let validMimeType = mimeType?.toLowerCase()?.trim() || "image/jpeg";
  if (!VALID_MIME_TYPES.includes(validMimeType)) {
    console.warn(
      `[Worker] [Job ${jobId}] Invalid MIME type "${mimeType}", defaulting to image/jpeg`,
    );
    validMimeType = "image/jpeg";
  }

  console.log(
    `[Worker] [Job ${jobId}] Cleaned base64 length: ${cleanBase64.length}, MIME type: ${validMimeType}`,
  );

  // Detect barcode using Google Vision API
  console.log(
    `[Worker] [Job ${jobId}] Calling Google Vision API for barcode detection...`,
  );
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
    console.error(`[Worker] [Job ${jobId}] ❌ Barcode detection failed`);
    throw new Error("Barcode detection failed");
  }

  const visionData = await visionResponse.json();
  const annotations = visionData.responses[0]?.barcodeAnnotations;

  if (!annotations || annotations.length === 0) {
    console.error(`[Worker] [Job ${jobId}] ❌ No barcode found`);
    throw new Error("No barcode found in image");
  }

  const barcode = annotations[0].description;
  console.log(`[Worker] [Job ${jobId}] ✅ Barcode detected: ${barcode}`);

  // Check cache first
  const cachedResult = await sql`
    SELECT ounces, product_name, source
    FROM barcode_cache
    WHERE barcode = ${barcode}
    LIMIT 1
  `;

  let containerOunces;
  let productName = "Unknown Product";

  if (cachedResult.length > 0) {
    containerOunces = parseFloat(cachedResult[0].ounces);
    productName = cachedResult[0].product_name;
    console.log(
      `[Worker] [Job ${jobId}] ✅ Cache hit: ${productName}, ${containerOunces}oz`,
    );
  } else {
    console.log(`[Worker] [Job ${jobId}] Cache miss, calling GPT-4o...`);
    // Use GPT Vision to analyze the container
    const imageDataUrl = `data:${validMimeType};base64,${cleanBase64}`;

    const gptData = await callOpenAIWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
    );

    const content = gptData.choices[0].message.content;

    const ouncesMatch = content.match(/OUNCES:\s*(\d+\.?\d*)/i);
    containerOunces = ouncesMatch ? parseFloat(ouncesMatch[1]) : 16;

    const productMatch = content.match(/PRODUCT:\s*(.+?)(?:\n|$)/i);
    productName = productMatch ? productMatch[1].trim() : "Unknown Product";

    console.log(
      `[Worker] [Job ${jobId}] ✅ GPT identified: ${productName}, ${containerOunces}oz`,
    );

    // Cache for future use
    await sql`
      INSERT INTO barcode_cache (barcode, product_name, ounces, source)
      VALUES (${barcode}, ${productName}, ${containerOunces}, ${"GPT Vision"})
      ON CONFLICT (barcode) DO NOTHING
    `;
  }

  // Calculate consumed amount
  const settingsRows = await sql`
    SELECT sip_size FROM user_settings WHERE user_id = ${userId}
  `;
  const sipSize = settingsRows[0]?.sip_size || "medium";

  let consumedOunces = containerOunces;

  if (percentage) {
    consumedOunces = calculatePercentageBasedConsumption(
      containerOunces,
      percentage,
    );
  } else if (duration) {
    consumedOunces = calculateDurationBasedConsumption(duration, sipSize);
  }

  consumedOunces = Math.round(consumedOunces * 100) / 100;
  consumedOunces = Math.max(0.5, Math.min(consumedOunces, 128));

  const finalLiquidType = liquidType || "water";

  const hydrationMultiplier = getHydrationPercentage(finalLiquidType);

  if (hydrationMultiplier === 0) {
    throw new Error("Alcohol is worth 0 oz of water");
  }

  const adjustedOunces = calculateFinalOunces(
    consumedOunces,
    servings,
    hydrationMultiplier,
  );
  const roundedOunces = smartRound(adjustedOunces);

  console.log(`[Worker] [Job ${jobId}] Final: ${roundedOunces}oz`);

  // Create water entry
  const entry = await createWaterEntry({
    userId,
    ounces: roundedOunces,
    classification: "disposable-bottle",
    liquidType: finalLiquidType,
    servings,
  });

  console.log(`[Worker] [Job ${jobId}] ✅ Water entry created: ${entry.id}`);

  return {
    entryId: entry.id,
    ounces: roundedOunces,
    containerCapacity: containerOunces,
    classification: "disposable-bottle",
    liquidType: finalLiquidType,
    productName,
    barcode,
    timestamp: entry.timestamp,
  };
}
