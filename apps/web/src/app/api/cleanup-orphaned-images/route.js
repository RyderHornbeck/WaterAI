import sql from "@/app/api/utils/sql";

// Helper to delete image from R2
async function deleteFromR2(imageUrl) {
  if (!imageUrl) return false;

  try {
    // Extract the file key from the URL
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!imageUrl.startsWith(publicUrl)) {
      console.log("Image not in R2, skipping:", imageUrl);
      return false;
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
    return true;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    return false;
  }
}

/**
 * Background cleanup job to find and delete orphaned images in R2
 *
 * An image is considered "orphaned" if:
 * 1. It's been uploaded more than 1 hour ago AND
 * 2. It's not referenced in any water_entries OR user_bottles
 *
 * This catches cases where:
 * - User uploaded an image but the app crashed before analysis completed
 * - Network error prevented cleanup from running
 * - User's device lost connection during the flow
 */
export async function POST(request) {
  try {
    // Optional: Add authentication/API key check here to prevent abuse
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET_KEY}`) {
      // For now, we'll allow it to run without auth for testing
      // In production, you should set CLEANUP_SECRET_KEY and require it
      console.warn("Cleanup job running without authentication");
    }

    console.log("=== STARTING ORPHANED IMAGES CLEANUP ===");

    // Find all image URLs in the database
    const [waterEntryImages, userBottleImages] = await sql.transaction([
      sql`SELECT DISTINCT image_url FROM water_entries WHERE image_url IS NOT NULL`,
      sql`SELECT DISTINCT image_url FROM user_bottles WHERE image_url IS NOT NULL`,
    ]);

    const referencedImages = new Set();
    waterEntryImages.forEach((row) => referencedImages.add(row.image_url));
    userBottleImages.forEach((row) => referencedImages.add(row.image_url));

    console.log(`Found ${referencedImages.size} images referenced in database`);

    // Lazy load AWS SDK for listing objects
    const { S3Client, ListObjectsV2Command } = await import(
      "@aws-sdk/client-s3"
    ).then((m) => m);

    // List all objects in R2 bucket
    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const publicUrl = process.env.R2_PUBLIC_URL;
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
      }),
    );

    const allObjects = listResponse.Contents || [];
    console.log(`Found ${allObjects.length} total objects in R2`);

    // Find orphaned images (older than 1 hour and not in database)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let deletedCount = 0;
    let skippedCount = 0;

    for (const obj of allObjects) {
      const imageUrl = `${publicUrl}/${obj.Key}`;

      // Skip if image is referenced in database
      if (referencedImages.has(imageUrl)) {
        skippedCount++;
        continue;
      }

      // Skip if image was uploaded less than 1 hour ago (might still be in use)
      if (obj.LastModified > oneHourAgo) {
        console.log(
          `Skipping recent image: ${obj.Key} (uploaded ${obj.LastModified.toISOString()})`,
        );
        skippedCount++;
        continue;
      }

      // This image is orphaned - delete it
      console.log(
        `Deleting orphaned image: ${obj.Key} (uploaded ${obj.LastModified.toISOString()})`,
      );
      const deleted = await deleteFromR2(imageUrl);
      if (deleted) {
        deletedCount++;
      }
    }

    console.log("=== CLEANUP COMPLETE ===");
    console.log(`Total objects in R2: ${allObjects.length}`);
    console.log(`Referenced in database: ${referencedImages.size}`);
    console.log(`Orphaned images deleted: ${deletedCount}`);
    console.log(`Images skipped (recent or referenced): ${skippedCount}`);

    return Response.json({
      success: true,
      totalObjects: allObjects.length,
      referencedImages: referencedImages.size,
      deletedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Error during orphaned images cleanup:", error);
    return Response.json(
      {
        error: "Cleanup failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
