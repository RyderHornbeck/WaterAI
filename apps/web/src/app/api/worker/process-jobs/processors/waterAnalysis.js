import sql from "@/app/api/utils/sql";
import { smartRound, getHydrationPercentage } from "../utils/hydration";
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

// Main job processor for water analysis
export async function processWaterAnalysisJob(job) {
  const jobId = job.id;
  console.log(`[Worker] [Job ${jobId}] Starting water analysis...`);

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

  const imageDataUrl = `data:${validMimeType};base64,${cleanBase64}`;
  console.log(
    `[Worker] [Job ${jobId}] Created data URL with MIME type: ${validMimeType}, base64 length: ${cleanBase64.length}`,
  );

  // Fetch user settings
  const settingsRows = await sql`
    SELECT hand_size, sip_size FROM user_settings WHERE user_id = ${userId}
  `;
  const handSize = settingsRows[0]?.hand_size || "medium";
  const sipSize = settingsRows[0]?.sip_size || "medium";
  console.log(
    `[Worker] [Job ${jobId}] User settings: handSize=${handSize}, sipSize=${sipSize}`,
  );

  // 🚀 SINGLE COMPREHENSIVE GPT-5-MINI CALL - MUCH FASTER!
  console.log(
    `[Worker] [Job ${jobId}] Calling GPT-5-mini for complete analysis...`,
  );

  let prompt = `Analyze this image of a liquid container. User has ${handSize} hands.

Keep in mind hand size when estimating container size:
- Large hands make bottles look smaller than they are
- Medium hands show bottles at normal size  
- Small hands make bottles look larger than they are

`;

  // Handle duration-based analysis
  if (duration) {
    const seconds = parseInt(duration.split(" ")[0], 10);
    const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
    const ozPerSecond = sipRates[sipSize] || sipRates.medium;
    const calculatedOunces = seconds * ozPerSecond;

    prompt += `The user drank for ${seconds} seconds with ${sipSize} sip size.
Calculated consumption: ${calculatedOunces.toFixed(1)} oz (DO NOT change this amount)

`;
  }

  // Add estimation option
  prompt += `**OPTION 1: Estimate container**
Estimate the container capacity in ounces.

Standard sizes:
- Small (1-8oz): shot, espresso, sample cup, teacup, coffee cup
- Medium (9-16oz): mug, pint, 12oz can, 16.9oz bottle
- Large (17-40oz): sports bottle (20-24oz), tumbler (30-32oz), 1L bottle (33.8oz)
- XL (41-128oz): 40oz tumbler, half gallon (64oz), gallon (128oz)

Classify container:
- reusable-bottle (Hydro Flask, Stanley, insulated bottles)
- disposable-bottle (plastic water bottles)
- disposable-can (soda/energy drink cans)
- Cup/Glass (home/office cups, restaurant glasses)
- water-fountain
- faucet-tap
- filtered-dispenser

Detect liquid type from labels/branding:
- water, diet soda, soda, sports drink, energy drink, coffee, tea, milk, juice, smoothie, alcohol
- If clear liquid or no label visible: assume water

Respond: ESTIMATE:[ounces]:[classification]:[liquid_type]

**OPTION 2: No liquid container found**
If image has NO liquid container, cup, glass, or liquid source:
NO_WATER:Could not detect a liquid container in this image.

Respond with ONLY one format above. Nothing else.`;

  // Build content array with image
  const finalContent = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ];

  const finalData = await callOpenAIWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-5-mini",
      messages: [{ role: "user", content: finalContent }],
      max_completion_tokens: 100,
    },
  );

  const decision = finalData.choices[0].message.content.trim();
  console.log(`[Worker] [Job ${jobId}] ✅ GPT-5-mini decision:`, decision);

  // Parse decision
  let containerOunces;
  let classification = "reusable-bottle";
  let detectedLiquidType = null;

  if (decision.startsWith("ESTIMATE:")) {
    const parts = decision.split(":");
    containerOunces = parseFloat(parts[1]);
    classification = parts[2] || "reusable-bottle";
    detectedLiquidType = parts[3] || "water";
    console.log(
      `[Worker] [Job ${jobId}] Estimated ${containerOunces}oz, classification: ${classification}`,
    );
  } else if (decision.startsWith("NO_WATER:")) {
    const errorMessage = decision.substring("NO_WATER:".length).trim();
    console.error(`[Worker] [Job ${jobId}] ❌ No water detected`);
    throw new Error(errorMessage || "No water container detected in image");
  } else {
    containerOunces = parseFloat(decision);
    detectedLiquidType = "water";
    console.log(`[Worker] [Job ${jobId}] Fallback parse: ${containerOunces}oz`);
  }

  if (isNaN(containerOunces) || containerOunces < 1 || containerOunces > 128) {
    containerOunces = 16;
    console.log(`[Worker] [Job ${jobId}] Invalid ounces, defaulting to 16oz`);
  }

  containerOunces = Math.round(containerOunces * 2) / 2;

  // Calculate consumed amount
  let consumedOunces;
  if (duration) {
    const seconds = parseInt(duration.split(" ")[0], 10);
    const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
    const ozPerSecond = sipRates[sipSize] || sipRates.medium;
    consumedOunces = seconds * ozPerSecond;
  } else if (percentage) {
    consumedOunces = (containerOunces * percentage) / 100;
  } else {
    consumedOunces = containerOunces;
  }

  consumedOunces = Math.round(consumedOunces * 2) / 2;
  consumedOunces = Math.max(0.5, Math.min(consumedOunces, 128));

  const finalLiquidType = liquidType || detectedLiquidType || "water";

  // Apply hydration multiplier
  const hydrationMultiplier = getHydrationPercentage(finalLiquidType);

  if (hydrationMultiplier === 0) {
    console.error(`[Worker] [Job ${jobId}] ❌ Alcohol detected, worth 0 oz`);
    throw new Error(`Alcohol is worth 0 oz of water`);
  }

  const adjustedOunces = consumedOunces * (servings || 1) * hydrationMultiplier;
  const roundedOunces = smartRound(adjustedOunces);
  console.log(
    `[Worker] [Job ${jobId}] Final calculation: ${roundedOunces}oz (${finalLiquidType}, multiplier: ${hydrationMultiplier})`,
  );

  // Create water entry
  const entry = await createWaterEntry({
    userId,
    ounces: roundedOunces,
    classification,
    liquidType: finalLiquidType,
    servings: servings || 1,
  });

  console.log(`[Worker] [Job ${jobId}] ✅ Water entry created: ${entry.id}`);

  return {
    entryId: entry.id,
    ounces: roundedOunces,
    containerCapacity: containerOunces,
    classification,
    liquidType: finalLiquidType,
    matchedBottleId: null,
    timestamp: entry.timestamp,
  };
}
