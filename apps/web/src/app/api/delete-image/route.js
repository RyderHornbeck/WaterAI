import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

export async function POST(request) {
  try {
    // Check for Authorization header first (mobile apps send token this way)
    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
      }
    }

    // Fall back to session cookies if no valid token
    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return Response.json({ error: "Image URL is required" }, { status: 400 });
    }

    // Extract the file key from the URL
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!imageUrl.startsWith(publicUrl)) {
      console.log("Image not in R2, skipping:", imageUrl);
      return Response.json({ success: true, message: "Image not in R2" });
    }

    const key = imageUrl.replace(publicUrl + "/", "");

    // Lazy load AWS SDK only when needed
    const { S3Client, DeleteObjectCommand } = await import(
      "@aws-sdk/client-s3"
    ).then((m) => m);

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }),
    );

    console.log(`✓ Deleted from R2: ${key}`);

    return Response.json({ success: true, message: "Image deleted" });
  } catch (error) {
    console.error("Error deleting image from R2:", error);
    return Response.json(
      {
        error: "Failed to delete image",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
