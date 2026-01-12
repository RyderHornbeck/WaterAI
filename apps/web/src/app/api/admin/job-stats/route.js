import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const now = new Date();

    // Get counts by status
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `;

    // Get old job counts that should be cleaned up (using SQL INTERVAL)
    const completedOld = await sql`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE status = 'complete'
      AND completed_at < NOW() - INTERVAL '5 hours'
    `;

    const errorOld = await sql`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE status = 'error'
      AND completed_at < NOW() - INTERVAL '4 hours'
    `;

    const processingStuck = await sql`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE status = 'processing'
      AND started_at < NOW() - INTERVAL '10 minutes'
    `;

    const pendingOld = await sql`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '24 hours'
    `;

    // Get recent jobs (last 10)
    const recentJobs = await sql`
      SELECT id, job_type, status, created_at, completed_at, started_at, attempts
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return Response.json({
      timestamp: now.toISOString(),
      statusCounts: statusCounts.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      cleanupCandidates: {
        completedOld: parseInt(completedOld[0].count),
        errorOld: parseInt(errorOld[0].count),
        processingStuck: parseInt(processingStuck[0].count),
        pendingOld: parseInt(pendingOld[0].count),
        total:
          parseInt(completedOld[0].count) +
          parseInt(errorOld[0].count) +
          parseInt(processingStuck[0].count) +
          parseInt(pendingOld[0].count),
      },
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        type: job.job_type,
        status: job.status,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        attempts: job.attempts,
      })),
    });
  } catch (error) {
    console.error("Error getting job stats:", error);
    return Response.json(
      { error: "Failed to get job stats", details: error.message },
      { status: 500 },
    );
  }
}
