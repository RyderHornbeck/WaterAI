import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    const { count = 10 } = await request.json();

    console.log(`[Test] Creating ${count} test jobs for user ${userId}...`);

    // Create test jobs (simple water analysis jobs)
    const testJobs = [];
    for (let i = 0; i < count; i++) {
      const [job] = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload)
        VALUES (
          ${userId},
          'analyze_water',
          'pending',
          ${JSON.stringify({
            userId,
            base64: "test_image_data_" + i,
            mimeType: "image/jpeg",
            percentage: 100,
            duration: null,
            servings: 1,
            liquidType: null,
          })}
        )
        RETURNING id, created_at
      `;
      testJobs.push(job);
    }

    console.log(`[Test] ✅ Created ${count} test jobs`);

    return Response.json({
      message: `Created ${count} test jobs`,
      jobs: testJobs,
      instructions: "Check the job queue status at /api/monitor-workers",
    });
  } catch (error) {
    console.error("[Test] Error creating test jobs:", error);
    return Response.json(
      { error: "Failed to create test jobs", details: error.message },
      { status: 500 },
    );
  }
}
