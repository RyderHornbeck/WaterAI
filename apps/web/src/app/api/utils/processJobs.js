import sql from "@/app/api/utils/sql";
import { invalidateUserCaches } from "@/app/api/utils/cache";
import { upload } from "@/app/api/utils/upload";

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

// Main job processor for water analysis
async function processWaterAnalysisJob(job) {
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

  // Clean base64 string
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
    throw new Error("Invalid or empty base64 image data");
  }

  console.log(
    `[Worker] [Job ${jobId}] Cleaned base64, length: ${cleanBase64.length}`,
  );

  // Upload image to R2 storage
  console.log(`[Worker] [Job ${jobId}] Uploading image to R2...`);
  const uploadResult = await upload({
    base64: cleanBase64,
    mimeType: mimeType || "image/jpeg",
  });

  if (uploadResult.error) {
    throw new Error(`Image upload failed: ${uploadResult.error}`);
  }

  const imageUrl = uploadResult.url;
  console.log(`[Worker] [Job ${jobId}] ✅ Image uploaded to: ${imageUrl}`);

  const imageDataUrl = `data:${mimeType || "image/jpeg"};base64,${cleanBase64}`;

  // Fetch user's saved bottles
  const userBottles = await sql`
    SELECT id, image_url, ounces
    FROM user_bottles
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  console.log(
    `[Worker] [Job ${jobId}] Found ${userBottles.length} saved bottles`,
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

  let detailedAnalysis = "";
  let calculatedOunces = null;

  // DURATION PATH: Skip first prompt, calculate manually
  if (duration) {
    const seconds = parseInt(duration.split(" ")[0], 10);
    const sipRates = { small: 0.4, medium: 0.6, large: 0.85 };
    const ozPerSecond = sipRates[sipSize] || sipRates.medium;
    calculatedOunces = seconds * ozPerSecond;
    detailedAnalysis = `Duration-based calculation: ${seconds} seconds × ${ozPerSecond} oz/sec = ${calculatedOunces} oz (${sipSize} sip size)`;
    console.log(`[Worker] [Job ${jobId}] Duration mode: ${detailedAnalysis}`);
  } else {
    // PERCENTAGE/DEFAULT PATH: Use first GPT-5-nano prompt for size estimation
    console.log(
      `[Worker] [Job ${jobId}] Step 1: Calling GPT-5-nano for size estimation...`,
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

    const visionResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5-nano",
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
      throw new Error(errorData.error?.message || "GPT-5-nano analysis failed");
    }

    const visionData = await visionResponse.json();
    detailedAnalysis = visionData.choices[0].message.content;
    console.log(
      `[Worker] [Job ${jobId}] ✅ Step 1 analysis: ${detailedAnalysis}`,
    );
  }

  // STEP 2: Second GPT-5-nano call for final decision
  console.log(
    `[Worker] [Job ${jobId}] Step 2: Calling GPT-5-nano for final decision...`,
  );

  let finalPrompt = "";

  if (duration) {
    finalPrompt = `Review this image. Based on the user's sip size and drinking duration, the calculated amount consumed is ${calculatedOunces.toFixed(1)} oz. This is the correct amount.

You must choose ONE of three options:

`;
  } else {
    finalPrompt = `Review this image and the analysis below. You must choose ONE of three options:

Analysis from first pass:
${detailedAnalysis}

`;
  }

  if (userBottles.length > 0) {
    finalPrompt += `The user has ${userBottles.length} saved bottle(s). I will show you each one with their capacity.\n\n`;
    finalPrompt += `**OPTION 1: Match with saved bottle**\nIf the water bottle/cup in the current image matches ANY of the user's saved bottles (same brand, size, design, shape, color, labels), respond with:\nMATCH:[bottle_id]:${duration ? calculatedOunces.toFixed(1) : "[ounces]"}:[classification]:[liquid_type]\n\nFor example: MATCH:123:32:reusable-bottle:water\n\n`;
  }

  if (duration) {
    finalPrompt += `**OPTION ${userBottles.length > 0 ? "2" : "1"}: Classify the container**\nIf ${userBottles.length > 0 ? "there is NO match with saved bottles, but " : ""}the image shows a valid water bottle, cup, or water source, classify both the water source AND the liquid type. Respond with:\nESTIMATE:${calculatedOunces.toFixed(1)}:[classification]:[liquid_type]\n\nFor example: ESTIMATE:${calculatedOunces.toFixed(1)}:disposable-bottle:diet soda\n\n`;
  } else {
    finalPrompt += `**OPTION ${userBottles.length > 0 ? "2" : "1"}: Pick best estimate**\nIf ${userBottles.length > 0 ? "there is NO match with saved bottles, but " : ""}the image shows a valid water bottle, cup, or water source, pick the single best capacity estimate from the three estimates in the analysis above AND classify both the water source AND the liquid type. Respond with:\nESTIMATE:[number]:[classification]:[liquid_type]\n\nFor example: ESTIMATE:16.9:disposable-bottle:diet soda\n\n`;
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

`;

  finalPrompt += `**OPTION ${userBottles.length > 0 ? "3" : "2"}: No source of liquid found**\nIf the image does NOT contain any liquid container, cup, glass, or liquid source, respond with:\nNO_WATER:Could not detect a liquid container or liquid source in this image. Please try again with a clear photo of your liquid container.\n\n`;

  finalPrompt += `Respond with ONLY one of the formats above. Nothing else.`;

  const finalContent = [
    { type: "text", text: finalPrompt },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ];

  if (userBottles.length > 0) {
    for (const bottle of userBottles) {
      finalContent.push({
        type: "text",
        text: `Saved Bottle ID ${bottle.id}: ${bottle.ounces} oz`,
      });
      finalContent.push({
        type: "image_url",
        image_url: { url: bottle.image_url },
      });
    }
  }

  const finalResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: finalContent }],
        max_completion_tokens: 80,
      }),
    },
  );

  if (!finalResponse.ok) {
    const errorData = await finalResponse.json();
    throw new Error(
      errorData.error?.message || "GPT-5-nano final decision failed",
    );
  }

  const finalData = await finalResponse.json();
  const decision = finalData.choices[0].message.content.trim();
  console.log(`[Worker] [Job ${jobId}] ✅ Step 2 decision: ${decision}`);

  // Parse decision
  let containerOunces;
  let matchedBottleId = null;
  let classification = "reusable-bottle";
  let detectedLiquidType = null;

  if (decision.startsWith("MATCH:")) {
    const parts = decision.split(":");
    matchedBottleId = parseInt(parts[1], 10);
    containerOunces = parseFloat(parts[2]);
    classification = parts[3] || "reusable-bottle";
    detectedLiquidType = parts[4] || "water";
  } else if (decision.startsWith("ESTIMATE:")) {
    const parts = decision.split(":");
    containerOunces = parseFloat(parts[1]);
    classification = parts[2] || "reusable-bottle";
    detectedLiquidType = parts[3] || "water";
  } else if (decision.startsWith("NO_WATER:")) {
    const errorMessage = decision.substring("NO_WATER:".length).trim();
    throw new Error(errorMessage || "No water container detected in image");
  } else {
    containerOunces = parseFloat(decision);
    detectedLiquidType = "water";
  }

  if (isNaN(containerOunces) || containerOunces < 1 || containerOunces > 128) {
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
    throw new Error("Alcohol is worth 0 oz of water");
  }

  const adjustedOunces = totalOunces * hydrationMultiplier;
  const roundedOunces = smartRound(adjustedOunces);

  console.log(
    `[Worker] [Job ${jobId}] ✅ Final: ${roundedOunces}oz (${finalLiquidType})`,
  );

  invalidateUserCaches(userId);

  return {
    ounces: roundedOunces,
    containerCapacity: containerOunces,
    classification,
    liquidType: finalLiquidType,
    matchedBottleId,
    imageUrl,
  };
}

// Processor for barcode analysis jobs
async function processBarcodeAnalysisJob(job) {
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

  if (!base64) {
    throw new Error("No image data provided");
  }

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
    throw new Error("Invalid or empty base64 image data");
  }

  const uploadResult = await upload({
    base64: cleanBase64,
    mimeType: mimeType || "image/jpeg",
  });

  if (uploadResult.error) {
    throw new Error(`Image upload failed: ${uploadResult.error}`);
  }

  const imageUrl = uploadResult.url;

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
  } else {
    const imageDataUrl = `data:${mimeType || "image/jpeg"};base64,${cleanBase64}`;

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

    const gptData = await gptResponse.json();
    const content = gptData.choices[0].message.content;

    const ouncesMatch = content.match(/OUNCES:\s*(\d+\.?\d*)/i);
    containerOunces = ouncesMatch ? parseFloat(ouncesMatch[1]) : 16;

    const productMatch = content.match(/PRODUCT:\s*(.+?)(?:\n|$)/i);
    productName = productMatch ? productMatch[1].trim() : "Unknown Product";

    await sql`
      INSERT INTO barcode_cache (barcode, product_name, ounces, source)
      VALUES (${barcode}, ${productName}, ${containerOunces}, ${"GPT Vision"})
      ON CONFLICT (barcode) DO NOTHING
    `;
  }

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

  consumedOunces = Math.round(consumedOunces * 100) / 100;
  consumedOunces = Math.max(0.5, Math.min(consumedOunces, 128));

  const servingsCount = servings || 1;
  const totalOunces = consumedOunces * servingsCount;
  const finalLiquidType = liquidType || "water";

  const hydrationMultiplier = getHydrationPercentage(finalLiquidType);

  if (hydrationMultiplier === 0) {
    throw new Error("Alcohol is worth 0 oz of water");
  }

  const adjustedOunces = totalOunces * hydrationMultiplier;
  const roundedOunces = smartRound(adjustedOunces);

  invalidateUserCaches(userId);

  return {
    ounces: roundedOunces,
    containerCapacity: containerOunces,
    classification: "disposable-bottle",
    liquidType: finalLiquidType,
    productName,
    barcode,
    imageUrl,
  };
}

// Processor for text analysis jobs
async function processTextAnalysisJob(job) {
  const jobId = job.id;
  console.log(`[Worker] [Job ${jobId}] Starting text analysis...`);

  const { userId, description } = job.payload;

  const chatResponse = await fetch(
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
            role: "system",
            content: `You are a precise water intake estimation assistant. Analyze the description and:

1. Identify the container type and size
2. Determine the liquid type (water, soda, diet soda, sports drink, energy drink, coffee, tea, milk, juice, smoothie, alcohol)
3. Calculate the RAW ounces consumed (do NOT apply hydration percentages)

Standard sizes:
- Small glass/cup: 6-10oz
- Medium glass/cup: 10-14oz
- Large glass/cup: 14-20oz
- Water bottle: 16.9oz (500mL), 20oz, 24oz, 32oz
- Soda can: 12oz
- Coffee mug: 8-16oz

If no liquid type mentioned, assume water.

Format:
FINAL ANSWER: [ounces] oz | LIQUID: [type]

Example: "FINAL ANSWER: 12 oz | LIQUID: diet soda"`,
          },
          {
            role: "user",
            content: description,
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

  const chatData = await chatResponse.json();
  const content = chatData.choices[0].message.content;

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

  ounces = Math.round(parseFloat(ounces) * 100) / 100;

  const hydrationMultiplier = getHydrationPercentage(liquidType);

  if (hydrationMultiplier === 0) {
    throw new Error("Alcohol is worth 0 oz of water");
  }

  const adjustedOunces = ounces * hydrationMultiplier;
  const roundedOunces = smartRound(adjustedOunces);

  invalidateUserCaches(userId);

  return {
    ounces: roundedOunces,
    classification: "description",
    liquidType,
  };
}

// Main function to process a single job
export async function processSingleJob(jobId) {
  console.log(`[processSingleJob] Processing job ${jobId}...`);

  try {
    const jobs = await sql`
      SELECT id, user_id, job_type, payload, attempts, max_attempts, status
      FROM jobs
      WHERE id = ${jobId}
      LIMIT 1
    `;

    if (jobs.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = jobs[0];

    if (job.status !== "pending") {
      console.log(
        `[processSingleJob] Job ${jobId} is already ${job.status}, skipping`,
      );
      return;
    }

    await sql`
      UPDATE jobs
      SET status = 'processing',
          started_at = CURRENT_TIMESTAMP,
          attempts = attempts + 1
      WHERE id = ${jobId}
    `;

    let result;

    if (job.job_type === "analyze_water") {
      result = await processWaterAnalysisJob(job);
    } else if (job.job_type === "analyze_barcode") {
      result = await processBarcodeAnalysisJob(job);
    } else if (job.job_type === "analyze_text") {
      result = await processTextAnalysisJob(job);
    } else {
      throw new Error(`Unknown job type: ${job.job_type}`);
    }

    await sql`
      UPDATE jobs
      SET status = 'complete',
          result = ${JSON.stringify(result)},
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ${jobId}
    `;

    console.log(`[processSingleJob] ✅ Job ${jobId} completed successfully`);
    return result;
  } catch (error) {
    console.error(`[processSingleJob] ❌ Job ${jobId} failed:`, error.message);

    const jobs = await sql`
      SELECT attempts, max_attempts FROM jobs WHERE id = ${jobId}
    `;

    if (jobs.length > 0) {
      const { attempts, max_attempts } = jobs[0];
      const shouldRetry = attempts < max_attempts;

      if (shouldRetry) {
        await sql`
          UPDATE jobs
          SET status = 'pending',
              error_message = ${error.message}
          WHERE id = ${jobId}
        `;
        console.log(
          `[processSingleJob] Job ${jobId} will be retried (attempt ${attempts}/${max_attempts})`,
        );
      } else {
        await sql`
          UPDATE jobs
          SET status = 'error',
              error_message = ${error.message},
              completed_at = CURRENT_TIMESTAMP
          WHERE id = ${jobId}
        `;
        console.log(
          `[processSingleJob] Job ${jobId} permanently failed after ${attempts} attempts`,
        );
      }
    }

    throw error;
  }
}
