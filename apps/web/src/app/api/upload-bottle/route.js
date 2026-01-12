import { auth } from "@/auth";
import { upload } from "@/app/api/utils/upload";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(
      `[API upload-bottle ${timestamp}] ========== UPLOAD BOTTLE REQUEST START ==========`,
    );

    // Step 1: Authenticate user
    let userId = null;
    const token = getTokenFromRequest(request);

    if (token) {
      console.log(
        `[API upload-bottle ${timestamp}] Step 1a: Token found, validating...`,
      );
      try {
        const user = await validateToken(token);
        if (user) {
          userId = parseInt(user.id, 10);
          console.log(
            `[API upload-bottle ${timestamp}] ✅ Step 1a: Token validated`,
            { userId },
          );
        } else {
          console.log(
            `[API upload-bottle ${timestamp}] ⚠️ Step 1a: Token validation failed`,
          );
        }
      } catch (tokenError) {
        console.error(
          `[API upload-bottle ${timestamp}] ❌ Step 1a FAILED: Token validation error`,
          {
            name: tokenError.name,
            message: tokenError.message,
            stack: tokenError.stack?.substring(0, 500),
          },
        );
      }
    }

    // Fall back to session cookies
    if (!userId) {
      console.log(
        `[API upload-bottle ${timestamp}] Step 1b: Checking session cookies...`,
      );
      try {
        const session = await auth();
        if (session?.user?.id) {
          userId = parseInt(session.user.id, 10);
          console.log(
            `[API upload-bottle ${timestamp}] ✅ Step 1b: Session validated`,
            { userId },
          );
        } else {
          console.log(
            `[API upload-bottle ${timestamp}] ❌ Step 1b FAILED: No session found`,
          );
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      } catch (authError) {
        console.error(
          `[API upload-bottle ${timestamp}] ❌ Step 1b FAILED: Auth error`,
          {
            name: authError.name,
            message: authError.message,
            stack: authError.stack?.substring(0, 500),
          },
        );
        return Response.json(
          {
            error: "Authentication failed",
            errorDetails: {
              type: authError.constructor?.name,
              message: authError.message,
            },
          },
          { status: 500 },
        );
      }
    }

    // Step 2: Parse request body
    console.log(
      `[API upload-bottle ${timestamp}] Step 2: Parsing request body...`,
    );
    let base64, mimeType;
    try {
      const body = await request.json();
      base64 = body.base64;
      mimeType = body.mimeType;
      console.log(`[API upload-bottle ${timestamp}] ✅ Step 2: Body parsed`, {
        hasBase64: !!base64,
        base64Length: base64?.length,
        mimeType,
      });
    } catch (parseError) {
      console.error(
        `[API upload-bottle ${timestamp}] ❌ Step 2 FAILED: JSON parse error`,
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

    // Step 3: Validate input
    if (!base64 || !mimeType) {
      console.log(
        `[API upload-bottle ${timestamp}] ❌ Step 3 FAILED: Missing required fields`,
        {
          hasBase64: !!base64,
          hasMimeType: !!mimeType,
        },
      );
      return Response.json(
        { error: "Image data and mimeType are required" },
        { status: 400 },
      );
    }
    console.log(`[API upload-bottle ${timestamp}] ✅ Step 3: Input validated`);

    // Step 4: Check R2 environment variables
    console.log(
      `[API upload-bottle ${timestamp}] Step 4: Checking R2 config...`,
    );
    const r2Config = {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasBucketName: !!process.env.R2_BUCKET_NAME,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasPublicUrl: !!process.env.R2_PUBLIC_URL,
    };
    console.log(`[API upload-bottle ${timestamp}] R2 config status:`, r2Config);

    if (
      !r2Config.hasAccountId ||
      !r2Config.hasBucketName ||
      !r2Config.hasAccessKey ||
      !r2Config.hasSecretKey
    ) {
      console.error(
        `[API upload-bottle ${timestamp}] ❌ Step 4 FAILED: Missing R2 credentials`,
      );
      return Response.json(
        {
          error: "Server configuration error - R2 storage not configured",
          errorDetails: {
            type: "ConfigurationError",
            missingVars: Object.entries(r2Config)
              .filter(([key, val]) => !val)
              .map(([key]) => key),
          },
        },
        { status: 500 },
      );
    }
    console.log(`[API upload-bottle ${timestamp}] ✅ Step 4: R2 config valid`);

    // Step 5: Convert base64 to buffer
    console.log(
      `[API upload-bottle ${timestamp}] Step 5: Converting base64 to buffer...`,
    );
    let imageBuffer;
    try {
      imageBuffer = Buffer.from(base64, "base64");
      console.log(
        `[API upload-bottle ${timestamp}] ✅ Step 5: Buffer created`,
        {
          bufferSize: imageBuffer.length,
        },
      );
    } catch (bufferError) {
      console.error(
        `[API upload-bottle ${timestamp}] ❌ Step 5 FAILED: Buffer conversion error`,
        {
          name: bufferError.name,
          message: bufferError.message,
        },
      );
      return Response.json(
        {
          error: "Invalid base64 image data",
          errorDetails: {
            type: bufferError.constructor?.name,
            message: bufferError.message,
          },
        },
        { status: 400 },
      );
    }

    // Step 6: Upload to R2
    console.log(`[API upload-bottle ${timestamp}] Step 6: Uploading to R2...`);
    let uploadResult;
    try {
      uploadResult = await upload({
        buffer: imageBuffer,
        mimeType: mimeType,
      });
      console.log(`[API upload-bottle ${timestamp}] Upload result:`, {
        hasError: !!uploadResult.error,
        hasUrl: !!uploadResult.url,
      });
    } catch (uploadError) {
      console.error(
        `[API upload-bottle ${timestamp}] ❌ Step 6 FAILED: Upload exception`,
        {
          name: uploadError.name,
          message: uploadError.message,
          stack: uploadError.stack?.substring(0, 500),
        },
      );
      return Response.json(
        {
          error: `Upload failed: ${uploadError.message}`,
          errorDetails: {
            type: uploadError.constructor?.name,
            message: uploadError.message,
            stack: uploadError.stack?.substring(0, 300),
          },
        },
        { status: 500 },
      );
    }

    if (uploadResult.error) {
      console.error(
        `[API upload-bottle ${timestamp}] ❌ Step 6 FAILED: R2 upload error`,
        uploadResult.error,
      );
      return Response.json(
        {
          error: uploadResult.error,
          errorDetails: {
            type: "R2UploadError",
            message: uploadResult.error,
          },
        },
        { status: 500 },
      );
    }

    console.log(
      `[API upload-bottle ${timestamp}] ✅ Step 6: Upload successful`,
      {
        url: uploadResult.url,
      },
    );
    console.log(
      `[API upload-bottle ${timestamp}] ========== UPLOAD BOTTLE REQUEST END ==========`,
    );

    return Response.json({
      url: uploadResult.url,
    });
  } catch (error) {
    console.error(`[API upload-bottle ${timestamp}] ❌❌❌ UNEXPECTED ERROR`);
    console.error(`[API upload-bottle ${timestamp}] Error type:`, typeof error);
    console.error(`[API upload-bottle ${timestamp}] Error name:`, error?.name);
    console.error(
      `[API upload-bottle ${timestamp}] Error message:`,
      error?.message,
    );
    console.error(
      `[API upload-bottle ${timestamp}] Error stack:`,
      error?.stack,
    );

    // Build comprehensive error details
    const errorDetails = {
      type: error?.constructor?.name || typeof error,
      name: error?.name || "Unknown",
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack?.substring(0, 500),
    };

    return Response.json(
      {
        error: `UPLOAD_BOTTLE ERROR: ${errorDetails.message}`,
        errorDetails: errorDetails,
      },
      { status: 500 },
    );
  }
}
