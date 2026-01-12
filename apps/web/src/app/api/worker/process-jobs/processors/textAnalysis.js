import { smartRound, getHydrationPercentage } from "../utils/hydration";
import { createWaterEntry } from "../utils/waterEntry";
import { callOpenAIWithRetry } from "@/app/api/utils/openaiWithRetry";

// Processor for text analysis jobs
export async function processTextAnalysisJob(job) {
  const jobId = job.id;
  console.log(`[Worker] [Job ${jobId}] Starting text analysis...`);

  const { userId, description } = job.payload;

  // Use OpenAI gpt-4o-mini to analyze the text description
  console.log(
    `[Worker] [Job ${jobId}] Calling gpt-4o-mini for text analysis: "${description}"`,
  );

  let chatData;
  try {
    chatData = await callOpenAIWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
    );
  } catch (error) {
    console.error(
      `[Worker] [Job ${jobId}] ❌ OpenAI API error:`,
      error.message,
    );
    throw new Error(`Failed to analyze text: ${error.message}`);
  }

  const content = chatData.choices[0].message.content;
  console.log(`[Worker] [Job ${jobId}] GPT response:`, content);

  let ounces = 8; // default
  let liquidType = "water"; // default

  const finalAnswerMatch = content.match(/FINAL ANSWER:\s*(\d+\.?\d*)\s*oz/i);
  if (finalAnswerMatch) {
    ounces = parseFloat(finalAnswerMatch[1]);
  }

  const liquidMatch = content.match(/LIQUID:\s*([^\n|]+?)(?:\s*\||$)/i);
  if (liquidMatch) {
    liquidType = liquidMatch[1].trim();
  }

  ounces = Math.round(parseFloat(ounces) * 100) / 100;
  console.log(
    `[Worker] [Job ${jobId}] ✅ GPT parsed: ${ounces}oz, ${liquidType}`,
  );

  const hydrationMultiplier = getHydrationPercentage(liquidType);

  if (hydrationMultiplier === 0) {
    throw new Error("Alcohol is worth 0 oz of water");
  }

  const adjustedOunces = ounces * hydrationMultiplier;
  const roundedOunces = smartRound(adjustedOunces);

  console.log(`[Worker] [Job ${jobId}] Final: ${roundedOunces}oz`);

  // Create water entry
  const entry = await createWaterEntry({
    userId,
    ounces: roundedOunces,
    classification: "description",
    liquidType,
    servings: 1,
  });

  console.log(`[Worker] [Job ${jobId}] ✅ Water entry created: ${entry.id}`);

  return {
    entryId: entry.id,
    ounces: roundedOunces,
    classification: "description",
    liquidType,
    timestamp: entry.timestamp,
  };
}
