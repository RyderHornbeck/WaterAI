import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const timestamp = Date.now();
    console.log(`[${timestamp}] [Monitor] Checking job queue status...`);

    // Get overall statistics
    const [stats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'complete') as complete_count,
        COUNT(*) FILTER (WHERE status = 'error') as error_count,
        COUNT(*) as total_count
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `;

    // Get recent jobs (last 20)
    const recentJobs = await sql`
      SELECT 
        id,
        job_type,
        status,
        attempts,
        max_attempts,
        created_at,
        started_at,
        completed_at,
        CASE 
          WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
          ELSE NULL 
        END as duration_ms
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Get processing rate (jobs completed in last minute)
    const [rateStats] = await sql`
      SELECT 
        COUNT(*) as jobs_per_minute,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_duration_ms
      FROM jobs
      WHERE status = 'complete'
      AND completed_at > NOW() - INTERVAL '1 minute'
    `;

    // Get oldest pending job
    const [oldestPending] = await sql`
      SELECT 
        id,
        created_at,
        EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
      FROM jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `;

    console.log(`[${timestamp}] [Monitor] Queue status:`, {
      pending: stats.pending_count,
      processing: stats.processing_count,
      complete: stats.complete_count,
      error: stats.error_count,
    });

    return Response.json({
      timestamp: new Date().toISOString(),
      queue: {
        pending: parseInt(stats.pending_count),
        processing: parseInt(stats.processing_count),
        complete: parseInt(stats.complete_count),
        error: parseInt(stats.error_count),
        total: parseInt(stats.total_count),
      },
      performance: {
        jobs_per_minute: parseInt(rateStats.jobs_per_minute || 0),
        avg_duration_ms: rateStats.avg_duration_ms
          ? Math.round(parseFloat(rateStats.avg_duration_ms))
          : null,
      },
      oldest_pending: oldestPending
        ? {
            id: oldestPending.id,
            age_seconds: Math.round(parseFloat(oldestPending.age_seconds)),
            created_at: oldestPending.created_at,
          }
        : null,
      recent_jobs: recentJobs.map((job) => ({
        id: job.id,
        type: job.job_type,
        status: job.status,
        attempts: `${job.attempts}/${job.max_attempts}`,
        duration_ms: job.duration_ms ? Math.round(job.duration_ms) : null,
        created_at: job.created_at,
      })),
    });
  } catch (error) {
    console.error("[Monitor] Error:", error);
    return Response.json(
      { error: "Failed to fetch monitor data", details: error.message },
      { status: 500 },
    );
  }
}
