import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";
import {
  checkDailyLimit,
  incrementDailyLimit,
  getLimitErrorMessage,
} from "@/app/api/utils/dailyLimits";

// Valid image MIME types supported by OpenAI
const VALID_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request) {
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

    if (isNaN(userId)) {
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
        `[analyze-water-async] ⛔ Rate limit exceeded for user ${userId}: ${limitCheck.current}/${limitCheck.limit}`,
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
      return Response.json(
        { error: "Image data is required" },
        { status: 400 },
      );
    }

    // Validate and default mimeType
    let validMimeType = mimeType?.toLowerCase()?.trim() || "image/jpeg";
    if (!VALID_MIME_TYPES.includes(validMimeType)) {
      console.warn(`Invalid MIME type "${mimeType}", defaulting to image/jpeg`);
      validMimeType = "image/jpeg";
    }

    // Create a job record instead of a water entry
    const payload = {
      userId,
      base64,
      mimeType: validMimeType,
      percentage,
      duration,
      servings: servings || 1,
      liquidType: liquidType || null, // Don't default to "water" - let AI detect it!
    };

    const jobResult = await sql`
      INSERT INTO jobs (user_id, job_type, status, payload)
      VALUES (${userId}, 'analyze-water', 'pending', ${JSON.stringify(payload)})
      RETURNING id
    `;

    const jobId = jobResult[0].id;

    console.log(`[Job ${jobId}] Created analyze-water job for user ${userId}`);

    // 📊 Increment the daily limit counter
    await incrementDailyLimit(userId, "image_uploads");

    // Trigger worker processing in background (fire and forget)
    fetch(`${process.env.APP_URL}/api/worker/process-jobs`, {
      method: "POST",
    }).catch(() => {
      // Ignore errors - worker will pick it up on next scheduled run
    });

    // Return immediately - client will poll for results
    return Response.json({
      status: "pending",
      jobId,
      message: "Water analysis job created. Poll for results.",
    });
  } catch (error) {
    console.error("Error creating water analysis job:", error);
    return Response.json(
      {
        error: "Failed to create water analysis job",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
