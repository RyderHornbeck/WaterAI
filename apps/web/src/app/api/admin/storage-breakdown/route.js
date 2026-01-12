import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    // Get total job counts by status
    const statusBreakdown = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest,
        NOW() - MIN(created_at) as age_of_oldest
      FROM jobs
      GROUP BY status
      ORDER BY count DESC
    `;

    // Get jobs that are too recent to cleanup (completed in last 5 mins)
    const recentCompleted = await sql`
      SELECT 
        COUNT(*) as count,
        MIN(completed_at) as oldest,
        MAX(completed_at) as newest
      FROM jobs
      WHERE status = 'complete'
      AND completed_at >= NOW() - INTERVAL '5 minutes'
    `;

    // Get jobs that are too recent to cleanup (errors in last 4 hours)
    const recentErrors = await sql`
      SELECT 
        COUNT(*) as count,
        MIN(completed_at) as oldest,
        MAX(completed_at) as newest
      FROM jobs
      WHERE status = 'error'
      AND completed_at >= NOW() - INTERVAL '4 hours'
    `;

    // Get pending jobs that are too recent (less than 24 hours old)
    const recentPending = await sql`
      SELECT 
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM jobs
      WHERE status = 'pending'
      AND created_at >= NOW() - INTERVAL '24 hours'
    `;

    // Get approximate size of jobs table
    const tableSize = await sql`
      SELECT 
        pg_size_pretty(pg_total_relation_size('jobs')) as total_size,
        pg_size_pretty(pg_relation_size('jobs')) as table_size,
        pg_size_pretty(pg_total_relation_size('jobs') - pg_relation_size('jobs')) as indexes_size,
        pg_total_relation_size('jobs') as total_bytes
      FROM (SELECT 1) as dummy
    `;

    // Sample of what's left
    const sampleJobs = await sql`
      SELECT 
        id,
        status,
        job_type,
        created_at,
        completed_at,
        NOW() - created_at as age
      FROM jobs
      ORDER BY created_at ASC
      LIMIT 20
    `;

    return Response.json({
      statusBreakdown,
      tooRecentToDelete: {
        completed: recentCompleted[0],
        errors: recentErrors[0],
        pending: recentPending[0],
      },
      tableSize: tableSize[0],
      sampleOldestJobs: sampleJobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Storage Breakdown] Error:", error);
    return Response.json(
      {
        error: "Failed to get storage breakdown",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
