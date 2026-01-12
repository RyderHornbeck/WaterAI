import sql from "@/app/api/utils/sql";
import { processSingleJob } from "./processors/jobProcessor";

export async function POST(request) {
  const startTime = Date.now();
  const batchSize = 50; // Increased from 10 to 50 for higher throughput
  const allProcessedJobs = [];
  let batchNumber = 0;

  try {
    console.log(`\n========================================`);
    console.log(
      `[${startTime}] [Worker] Starting CONTINUOUS PARALLEL job processing...`,
    );
    console.log(`========================================\n`);

    // Continuous loop: process batches until no jobs remain
    while (true) {
      batchNumber++;
      const batchStartTime = Date.now();

      // Fetch and claim pending jobs atomically using a transaction
      // This prevents race conditions between multiple workers
      const [pendingJobs] = await sql.transaction([
        sql`
          WITH claimed_jobs AS (
            SELECT id, user_id, job_type, payload, attempts, max_attempts
            FROM jobs
            WHERE status = 'pending'
            AND attempts < max_attempts
            ORDER BY created_at ASC
            LIMIT ${batchSize}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE jobs
          SET status = 'processing',
              started_at = CURRENT_TIMESTAMP,
              attempts = jobs.attempts + 1
          FROM claimed_jobs
          WHERE jobs.id = claimed_jobs.id
          RETURNING jobs.id, jobs.user_id, jobs.job_type, jobs.payload, jobs.attempts, jobs.max_attempts
        `,
      ]);

      if (pendingJobs.length === 0) {
        console.log(
          `[${batchStartTime}] [Worker] Batch ${batchNumber}: No more pending jobs, stopping`,
        );
        break; // Exit loop when no jobs remain
      }

      console.log(
        `[${batchStartTime}] [Worker] Batch ${batchNumber}: Claimed ${pendingJobs.length} job(s) for processing IN PARALLEL`,
      );
      pendingJobs.forEach((job) => {
        const payloadSize = JSON.stringify(job.payload).length;
        const hasBase64 = job.payload?.base64 ? true : false;
        const base64Length = job.payload?.base64?.length || 0;
        console.log(
          `  - Job ${job.id}: type=${job.job_type}, attempts=${job.attempts}/${job.max_attempts}, payloadSize=${payloadSize} chars, hasBase64=${hasBase64}, base64Length=${base64Length}`,
        );
      });

      // Process all jobs in parallel (status already set to 'processing' by transaction)
      const jobPromises = pendingJobs.map(
        (job) => processSingleJob(job, true), // Pass skipStatusUpdate=true since we already updated it
      );

      // Wait for all jobs in this batch to complete in parallel
      const batchResults = await Promise.all(jobPromises);
      allProcessedJobs.push(...batchResults);

      const batchDuration = Date.now() - batchStartTime;
      const avgJobDuration =
        batchResults.reduce((sum, job) => sum + job.duration, 0) /
        batchResults.length;

      console.log(
        `\n[${batchStartTime}] [Worker] ✅ Batch ${batchNumber} complete: ${batchResults.length} jobs in ${batchDuration}ms (avg: ${avgJobDuration.toFixed(0)}ms/job)`,
      );

      // Continue to next batch immediately
    }

    const totalDuration = Date.now() - startTime;
    const avgDuration =
      allProcessedJobs.length > 0
        ? allProcessedJobs.reduce((sum, job) => sum + job.duration, 0) /
          allProcessedJobs.length
        : 0;

    console.log(`\n[${startTime}] [Worker] 🎉 CONTINUOUS PROCESSING COMPLETE`);
    console.log(
      `[${startTime}] [Worker] 📊 Total: ${allProcessedJobs.length} jobs across ${batchNumber} batches in ${totalDuration}ms`,
    );
    if (allProcessedJobs.length > 0) {
      console.log(
        `[${startTime}] [Worker] 📊 Throughput: ${((allProcessedJobs.length / totalDuration) * 1000).toFixed(1)} jobs/second`,
      );
      console.log(
        `[${startTime}] [Worker] 📊 Average job duration: ${avgDuration.toFixed(0)}ms`,
      );
    }
    console.log(`========================================\n`);

    return Response.json({
      message: "All pending jobs processed",
      processed: allProcessedJobs.length,
      batches: batchNumber,
      jobs: allProcessedJobs,
      duration: totalDuration,
      avgJobDuration: Math.round(avgDuration),
      throughput:
        allProcessedJobs.length > 0
          ? parseFloat(
              ((allProcessedJobs.length / totalDuration) * 1000).toFixed(2),
            )
          : 0,
    });
  } catch (error) {
    console.error(
      `[${startTime}] [Worker] ❌ Fatal error processing jobs:`,
      error,
    );
    console.error(`[${startTime}] [Worker] Error stack:`, error.stack);
    return Response.json(
      {
        error: "Failed to process jobs",
        details: error.message,
        processed: allProcessedJobs.length,
        batches: batchNumber,
      },
      { status: 500 },
    );
  }
}
