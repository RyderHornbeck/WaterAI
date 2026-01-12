import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const shouldReindex = url.searchParams.get("reindex") === "true";

  try {
    console.log(`[Cleanup] Starting job cleanup...`);
    console.log(`[Cleanup] Current time: ${new Date().toISOString()}`);

    // First, let's see what jobs exist and their timestamps
    const allJobs = await sql`
      SELECT 
        id, 
        status, 
        created_at, 
        started_at, 
        completed_at,
        NOW() as current_time,
        NOW() - created_at as age
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 20
    `;
    console.log(
      `[Cleanup] Sample of existing jobs:`,
      JSON.stringify(allJobs, null, 2),
    );

    // Get initial count
    const initialCount = await sql`SELECT COUNT(*) as total FROM jobs`;
    console.log(`[Cleanup] Initial job count: ${initialCount[0].total}`);

    // Delete completed jobs older than 1 hour
    const completedMatches = await sql`
      SELECT 
        COUNT(*) as count, 
        MIN(completed_at) as oldest, 
        MAX(completed_at) as newest,
        NOW() - INTERVAL '1 hour' as cutoff
      FROM jobs
      WHERE status = 'complete'
      AND completed_at < NOW() - INTERVAL '1 hour'
    `;
    console.log(
      `[Cleanup] Completed jobs matching criteria:`,
      completedMatches[0],
    );

    const deletedCompleted = await sql`
      DELETE FROM jobs
      WHERE status = 'complete'
      AND completed_at < NOW() - INTERVAL '1 hour'
      RETURNING id, completed_at
    `;
    console.log(`[Cleanup] Deleted ${deletedCompleted.length} completed jobs`);
    if (deletedCompleted.length > 0) {
      console.log(
        `[Cleanup] Sample deleted completed:`,
        deletedCompleted.slice(0, 3),
      );
    }

    // Delete failed jobs older than 3 hours
    const errorMatches = await sql`
      SELECT 
        COUNT(*) as count, 
        MIN(completed_at) as oldest, 
        MAX(completed_at) as newest,
        NOW() - INTERVAL '3 hours' as cutoff
      FROM jobs
      WHERE status = 'error'
      AND completed_at < NOW() - INTERVAL '3 hours'
    `;
    console.log(`[Cleanup] Error jobs matching criteria:`, errorMatches[0]);

    const deletedErrors = await sql`
      DELETE FROM jobs
      WHERE status = 'error'
      AND completed_at < NOW() - INTERVAL '3 hours'
      RETURNING id, completed_at
    `;
    console.log(`[Cleanup] Deleted ${deletedErrors.length} error jobs`);
    if (deletedErrors.length > 0) {
      console.log(
        `[Cleanup] Sample deleted errors:`,
        deletedErrors.slice(0, 3),
      );
    }

    // Reset abandoned processing jobs (stuck for more than 10 minutes)
    const processingMatches = await sql`
      SELECT 
        COUNT(*) as count, 
        MIN(started_at) as oldest, 
        MAX(started_at) as newest,
        NOW() - INTERVAL '10 minutes' as cutoff
      FROM jobs
      WHERE status = 'processing'
      AND started_at < NOW() - INTERVAL '10 minutes'
      AND attempts < max_attempts
    `;
    console.log(
      `[Cleanup] Processing jobs matching criteria:`,
      processingMatches[0],
    );

    const resetProcessing = await sql`
      UPDATE jobs
      SET status = 'pending',
          started_at = NULL,
          error_message = 'Reset from abandoned processing state'
      WHERE status = 'processing'
      AND started_at < NOW() - INTERVAL '10 minutes'
      AND attempts < max_attempts
      RETURNING id, started_at
    `;
    console.log(`[Cleanup] Reset ${resetProcessing.length} processing jobs`);
    if (resetProcessing.length > 0) {
      console.log(
        `[Cleanup] Sample reset processing:`,
        resetProcessing.slice(0, 3),
      );
    }

    // Delete old pending jobs that were never processed (older than 3 hours)
    const pendingMatches = await sql`
      SELECT 
        COUNT(*) as count, 
        MIN(created_at) as oldest, 
        MAX(created_at) as newest,
        NOW() - INTERVAL '3 hours' as cutoff
      FROM jobs
      WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '3 hours'
    `;
    console.log(`[Cleanup] Pending jobs matching criteria:`, pendingMatches[0]);

    const deletedPending = await sql`
      DELETE FROM jobs
      WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '3 hours'
      RETURNING id, created_at
    `;
    console.log(`[Cleanup] Deleted ${deletedPending.length} pending jobs`);
    if (deletedPending.length > 0) {
      console.log(
        `[Cleanup] Sample deleted pending:`,
        deletedPending.slice(0, 3),
      );
    }

    // Get final count to verify deletions worked
    const finalCount = await sql`SELECT COUNT(*) as total FROM jobs`;
    console.log(`[Cleanup] Final job count: ${finalCount[0].total}`);
    console.log(
      `[Cleanup] Total rows deleted: ${initialCount[0].total - finalCount[0].total}`,
    );

    // VACUUM to reclaim storage space
    console.log(`[Cleanup] Running VACUUM on jobs table to reclaim storage...`);
    // TEMPORARILY DISABLED FOR TESTING - Uncomment to reclaim storage
    // await sql`VACUUM jobs`;
    console.log(`[Cleanup] VACUUM skipped (disabled for testing)`);

    let reindexDuration = 0;
    if (shouldReindex) {
      console.log(
        `[Cleanup] REINDEX requested - rebuilding all indexes on jobs table...`,
      );
      const reindexStart = Date.now();

      // REINDEX rebuilds indexes from scratch, removing bloat
      await sql`REINDEX TABLE jobs`;

      reindexDuration = Date.now() - reindexStart;
      console.log(`[Cleanup] REINDEX completed in ${reindexDuration}ms`);
    }

    const totalDuration = Date.now() - startTime;

    const summary = {
      completedDeleted: deletedCompleted.length,
      errorsDeleted: deletedErrors.length,
      processingReset: resetProcessing.length,
      pendingDeleted: deletedPending.length,
      totalCleaned:
        deletedCompleted.length + deletedErrors.length + deletedPending.length,
      actualRowsDeleted: initialCount[0].total - finalCount[0].total,
      reindexed: shouldReindex,
      reindexDuration,
      duration: totalDuration,
    };

    console.log(`[Cleanup] Finished in ${totalDuration}ms:`, summary);

    return Response.json({
      message: "Cleanup completed",
      ...summary,
    });
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
    console.error("[Cleanup] Error stack:", error.stack);
    return Response.json(
      {
        error: "Failed to cleanup jobs",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
