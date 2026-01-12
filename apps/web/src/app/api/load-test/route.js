import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { base64, mimeType: contentType };
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageUrl, count = 500 } = await request.json();

    if (!imageUrl) {
      return Response.json({ error: "Image URL required" }, { status: 400 });
    }

    if (count < 1 || count > 1000) {
      return Response.json(
        { error: "Count must be between 1 and 1000" },
        { status: 400 },
      );
    }

    console.log(
      `🧪 Load test: Creating ${count} jobs for user ${session.user.id} with same image`,
    );

    // Fetch the image and convert to base64 once
    console.log(`📥 Fetching image from ${imageUrl}...`);

    let imageData;
    try {
      imageData = await fetchImageAsBase64(imageUrl);
      console.log(`✅ Image fetched and converted to base64`);
    } catch (fetchError) {
      console.error("❌ Image fetch failed:", fetchError);
      return Response.json(
        {
          error: `Failed to fetch image: ${fetchError.message}`,
          details:
            "Make sure the image URL is publicly accessible and not too large (max ~5MB recommended)",
        },
        { status: 400 },
      );
    }

    // Create jobs in batches for better performance
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);
    const allJobIds = [];

    for (let i = 0; i < batches; i++) {
      const currentBatchSize = Math.min(batchSize, count - i * batchSize);

      // Build values array for batch insert
      const values = [];
      const placeholders = [];

      for (let j = 0; j < currentBatchSize; j++) {
        const offset = values.length;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`,
        );
        values.push(
          session.user.id,
          "analyze_water",
          "pending",
          JSON.stringify({
            userId: session.user.id,
            base64: imageData.base64,
            mimeType: imageData.mimeType,
            percentage: null,
            duration: null,
            servings: 1,
            liquidType: null, // Let AI detect it - matches mobile behavior
          }),
        );
      }

      const placeholdersString = placeholders.join(", ");
      const query = `
        INSERT INTO jobs (user_id, job_type, status, payload)
        VALUES ${placeholdersString}
        RETURNING id
      `;

      try {
        const rows = await sql(query, values);
        allJobIds.push(...rows.map((r) => r.id));
        console.log(
          `✅ Created batch ${i + 1}/${batches} (${rows.length} jobs)`,
        );
      } catch (dbError) {
        console.error(`❌ Database error in batch ${i + 1}:`, dbError);
        return Response.json(
          {
            error: `Database error: ${dbError.message}`,
            jobsCreated: allJobIds.length,
          },
          { status: 500 },
        );
      }
    }

    console.log(`✅ Created ${allJobIds.length} test jobs with the same image`);

    return Response.json({
      success: true,
      jobIds: allJobIds,
      count: allJobIds.length,
      message: `Created ${allJobIds.length} test jobs using the same image`,
    });
  } catch (error) {
    console.error("❌ Load test error:", error);
    return Response.json(
      {
        error: error.message,
        stack: process.env.ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobIdsParam = searchParams.get("jobIds");

    if (!jobIdsParam) {
      return Response.json({ error: "Job IDs required" }, { status: 400 });
    }

    const jobIds = jobIdsParam.split(",").map((id) => parseInt(id, 10));

    if (jobIds.length > 1000) {
      return Response.json({ error: "Too many job IDs" }, { status: 400 });
    }

    // Query job status
    const placeholders = jobIds.map((_, i) => `$${i + 2}`).join(",");
    const query = `
      SELECT id, status, result, error_message, created_at, completed_at
      FROM jobs
      WHERE user_id = $1 AND id IN (${placeholders})
    `;
    const rows = await sql(query, [session.user.id, ...jobIds]);

    const statusCounts = {
      pending: 0,
      processing: 0,
      complete: 0,
      error: 0,
    };

    const completedJobs = [];
    const errorJobs = [];

    rows.forEach((job) => {
      statusCounts[job.status]++;

      if (job.status === "complete" && job.completed_at) {
        const duration = new Date(job.completed_at) - new Date(job.created_at);
        completedJobs.push(duration);
      }

      if (job.status === "error") {
        errorJobs.push({
          id: job.id,
          error: job.error_message,
        });
      }
    });

    const avgDuration =
      completedJobs.length > 0
        ? Math.round(
            completedJobs.reduce((a, b) => a + b, 0) / completedJobs.length,
          )
        : 0;

    const minDuration =
      completedJobs.length > 0 ? Math.min(...completedJobs) : 0;
    const maxDuration =
      completedJobs.length > 0 ? Math.max(...completedJobs) : 0;

    return Response.json({
      total: jobIds.length,
      statusCounts,
      timing: {
        avgMs: avgDuration,
        minMs: minDuration,
        maxMs: maxDuration,
        avgSeconds: (avgDuration / 1000).toFixed(1),
        minSeconds: (minDuration / 1000).toFixed(1),
        maxSeconds: (maxDuration / 1000).toFixed(1),
      },
      errors: errorJobs.slice(0, 10), // Show first 10 errors
      successRate: ((statusCounts.complete / jobIds.length) * 100).toFixed(1),
    });
  } catch (error) {
    console.error("Load test status error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
