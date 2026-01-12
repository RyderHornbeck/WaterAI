// Cron endpoint for scheduled job processing and cleanup
// This endpoint should be called periodically by an external cron service
//
// SCALING FOR 500+ CONCURRENT JOBS:
// ----------------------------------
// 1. VERTICAL SCALING: Batch size increased to 50 jobs/batch (in worker)
// 2. HORIZONTAL SCALING: Run 10 concurrent cron workers (see setup below)
// 3. DATABASE LOCKING: FOR UPDATE SKIP LOCKED prevents duplicate processing
//
// Recommended schedule:
//   - Every 1 minute: 10 PARALLEL workers process ALL pending jobs
//   - Every 1 hour: 1 worker cleans up old completed/failed jobs
//
// Performance with 10 parallel workers (1-minute cron):
//   - Each worker processes batches of 50 jobs (parallel)
//   - 10 workers × 50 jobs/batch × 6 batches/min = 3,000 jobs/min theoretical max
//   - Realistic capacity: 500-600 jobs/min (10s avg job time)
//   - Each worker continues batching until queue is empty
//
// SETUP INSTRUCTIONS (cron-job.org):
// -----------------------------------
// Create 10 identical cron jobs:
//   Job 1-10: https://your-app.anything.app/api/cron?action=process&worker=1
//   Schedule: */1 * * * * (every 1 minute)
//   Stagger start times by 1 second each to spread load
//
// Create 1 cleanup job:
//   URL: https://your-app.anything.app/api/cron?action=cleanup
//   Schedule: 0 * * * * (every hour)

export async function GET(request) {
  const startTime = Date.now();
  const results = {};

  try {
    // Extract base URL from the current request
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    // Get action from query params (default: both)
    const action = requestUrl.searchParams.get("action") || "all";
    const workerID = requestUrl.searchParams.get("worker") || "default";

    console.log(`[Cron] Worker ${workerID} starting, action: ${action}`);

    // Process pending jobs
    if (action === "all" || action === "process") {
      try {
        const processResponse = await fetch(
          `${baseUrl}/api/worker/process-jobs`,
          {
            method: "POST",
          },
        );
        const processData = await processResponse.json();
        results.process = processData;
      } catch (error) {
        results.process = { error: error.message };
      }
    }

    // Cleanup old jobs
    if (action === "all" || action === "cleanup") {
      try {
        const cleanupResponse = await fetch(
          `${baseUrl}/api/worker/cleanup-jobs`,
          {
            method: "POST",
          },
        );
        const cleanupData = await cleanupResponse.json();
        results.cleanup = cleanupData;
      } catch (error) {
        results.cleanup = { error: error.message };
      }
    }

    const totalDuration = Date.now() - startTime;

    return Response.json({
      message: "Cron job completed",
      action,
      duration: totalDuration,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return Response.json(
      {
        error: "Cron job failed",
        details: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// Support POST as well for cron services that prefer POST
export async function POST(request) {
  return GET(request);
}
