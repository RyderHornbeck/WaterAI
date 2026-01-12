import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Create timestamps for different scenarios
    const sixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);
    const tenHoursAgo = new Date(now - 10 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(now - 5 * 60 * 60 * 1000);
    const twentyMinutesAgo = new Date(now - 20 * 60 * 1000);
    const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000);

    const testJobs = [];

    // Insert 5 completed jobs older than 5 hours (should be cleaned up)
    for (let i = 0; i < 5; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, result, created_at, started_at, completed_at, attempts)
        VALUES (
          ${session.user.id},
          'water_analysis',
          'complete',
          ${JSON.stringify({ imageUrl: "test-old-complete.jpg" })},
          ${JSON.stringify({ ounces: 16, classification: "test" })},
          ${sixHoursAgo.toISOString()},
          ${sixHoursAgo.toISOString()},
          ${sixHoursAgo.toISOString()},
          1
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Old completed job (6 hours)",
        shouldCleanup: true,
      });
    }

    // Insert 3 completed jobs older than 10 hours (should definitely be cleaned up)
    for (let i = 0; i < 3; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, result, created_at, started_at, completed_at, attempts)
        VALUES (
          ${session.user.id},
          'barcode_analysis',
          'complete',
          ${JSON.stringify({ barcode: "123456789" })},
          ${JSON.stringify({ ounces: 12 })},
          ${tenHoursAgo.toISOString()},
          ${tenHoursAgo.toISOString()},
          ${tenHoursAgo.toISOString()},
          1
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Very old completed job (10 hours)",
        shouldCleanup: true,
      });
    }

    // Insert 4 error jobs older than 4 hours (should be cleaned up)
    for (let i = 0; i < 4; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, error_message, created_at, started_at, completed_at, attempts, max_attempts)
        VALUES (
          ${session.user.id},
          'text_analysis',
          'error',
          ${JSON.stringify({ description: "test error job" })},
          'Test error for cleanup',
          ${fiveHoursAgo.toISOString()},
          ${fiveHoursAgo.toISOString()},
          ${fiveHoursAgo.toISOString()},
          3,
          3
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Old error job (5 hours)",
        shouldCleanup: true,
      });
    }

    // Insert 2 stuck processing jobs (started 20 mins ago, should be cleaned up)
    for (let i = 0; i < 2; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, created_at, started_at, attempts)
        VALUES (
          ${session.user.id},
          'water_analysis',
          'processing',
          ${JSON.stringify({ imageUrl: "stuck-processing.jpg" })},
          ${twentyMinutesAgo.toISOString()},
          ${twentyMinutesAgo.toISOString()},
          1
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Stuck processing job (20 mins)",
        shouldCleanup: true,
      });
    }

    // Insert 3 old pending jobs (created 30 hours ago, should be cleaned up)
    for (let i = 0; i < 3; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, created_at, attempts)
        VALUES (
          ${session.user.id},
          'water_analysis',
          'pending',
          ${JSON.stringify({ imageUrl: "old-pending.jpg" })},
          ${thirtyHoursAgo.toISOString()},
          0
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Old pending job (30 hours)",
        shouldCleanup: true,
      });
    }

    // Also insert 2 recent completed jobs (should NOT be cleaned up)
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    for (let i = 0; i < 2; i++) {
      const result = await sql`
        INSERT INTO jobs (user_id, job_type, status, payload, result, created_at, started_at, completed_at, attempts)
        VALUES (
          ${session.user.id},
          'water_analysis',
          'complete',
          ${JSON.stringify({ imageUrl: "recent-job.jpg" })},
          ${JSON.stringify({ ounces: 16 })},
          ${twoHoursAgo.toISOString()},
          ${twoHoursAgo.toISOString()},
          ${twoHoursAgo.toISOString()},
          1
        )
        RETURNING id
      `;
      testJobs.push({
        id: result[0].id,
        type: "Recent completed job (2 hours)",
        shouldCleanup: false,
      });
    }

    return Response.json({
      success: true,
      message: `Created ${testJobs.length} test jobs`,
      summary: {
        oldCompleted: 8,
        oldErrors: 4,
        stuckProcessing: 2,
        oldPending: 3,
        recentCompleted: 2,
        totalShouldCleanup: 17,
        totalShouldKeep: 2,
      },
      jobs: testJobs,
    });
  } catch (error) {
    console.error("Error seeding test jobs:", error);
    return Response.json(
      { error: "Failed to seed test jobs", details: error.message },
      { status: 500 },
    );
  }
}
