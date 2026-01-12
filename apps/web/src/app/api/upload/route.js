import { upload } from "@/app/api/utils/upload";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

export async function POST(request) {
  try {
    let userId = null;

    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = parseInt(user.id, 10);
      }
    }

    // Fall back to session cookies if no Authorization header or token is invalid
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
    }

    // Get content type from header
    const contentType = request.headers.get("content-type");

    let uploadData = {};

    // Handle different upload types
    if (contentType?.includes("application/json")) {
      const body = await request.json();

      if (body.base64) {
        // Base64 upload
        uploadData.base64 = body.base64;
        uploadData.mimeType = body.mimeType || "image/jpeg";
      } else if (body.url) {
        // URL upload - fetch and convert to base64
        const response = await fetch(body.url);
        const buffer = await response.arrayBuffer();
        uploadData.buffer = Buffer.from(buffer);
        uploadData.mimeType =
          response.headers.get("content-type") || "image/jpeg";
      } else {
        return Response.json(
          { error: "Missing base64 or url in request body" },
          { status: 400 },
        );
      }
    } else if (contentType?.includes("multipart/form-data")) {
      // FormData upload
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file) {
        return Response.json(
          { error: "No file provided in form data" },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      uploadData.buffer = Buffer.from(arrayBuffer);
      uploadData.mimeType = file.type || "image/jpeg";
    } else if (contentType?.includes("application/octet-stream")) {
      // Raw buffer upload
      const arrayBuffer = await request.arrayBuffer();
      uploadData.buffer = Buffer.from(arrayBuffer);
      uploadData.mimeType = "image/jpeg";
    } else {
      return Response.json(
        { error: "Unsupported content type" },
        { status: 400 },
      );
    }

    console.log("Uploading to R2 for user", userId);
    console.log("MIME type:", uploadData.mimeType);

    // Upload to R2
    const uploadResult = await upload(uploadData);

    if (uploadResult.error) {
      console.error("R2 upload error:", uploadResult.error);
      return Response.json({ error: uploadResult.error }, { status: 500 });
    }

    console.log("R2 upload successful:", uploadResult.url);

    return Response.json({
      url: uploadResult.url,
      mimeType: uploadResult.mimeType,
    });
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return Response.json(
      {
        error: "Failed to upload",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
