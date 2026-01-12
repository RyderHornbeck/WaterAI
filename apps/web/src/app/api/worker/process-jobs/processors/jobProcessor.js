import sql from "@/app/api/utils/sql";
import { processWaterAnalysisJob } from "./waterAnalysis";
import { processBarcodeAnalysisJob } from "./barcodeAnalysis";
import { processTextAnalysisJob } from "./textAnalysis";

// Process a single job
export async function processSingleJob(job, skipStatusUpdate = false) {
  const jobStartTime = Date.now();

  try {
    console.log(
      `\n[${jobStartTime}] [Worker] 🔄 Processing job ${job.id} (type: ${job.job_type}, attempt ${job.attempts})`,
    );

    // Mark job as processing (only if not already done by transaction)
    if (!skipStatusUpdate) {
      await sql`
        UPDATE jobs
        SET status = 'processing',
            started_at = CURRENT_TIMESTAMP,
            attempts = attempts + 1
        WHERE id = ${job.id}
      `;

      console.log(
        `[${jobStartTime}] [Worker] Job ${job.id} marked as processing`,
      );
    } else {
      console.log(
        `[${jobStartTime}] [Worker] Job ${job.id} already marked as processing by transaction`,
      );
    }

    let result;

    // Route to appropriate processor based on job type
    if (job.job_type === "analyze_water") {
      result = await processWaterAnalysisJob(job);
    } else if (job.job_type === "analyze_barcode") {
      result = await processBarcodeAnalysisJob(job);
    } else if (job.job_type === "analyze_text") {
      result = await processTextAnalysisJob(job);
    } else {
      throw new Error(`Unknown job type: ${job.job_type}`);
    }

    console.log(
      `[${jobStartTime}] [Worker] Job ${job.id} analysis complete, result:`,
      {
        ounces: result.ounces,
        classification: result.classification,
        liquidType: result.liquidType,
      },
    );

    // Mark job as complete
    const resultJson = JSON.stringify(result);
    console.log(
      `[${jobStartTime}] [Worker] Marking job ${job.id} as complete with result (${resultJson.length} chars)`,
    );

    await sql`
      UPDATE jobs
      SET status = 'complete',
          result = ${resultJson},
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ${job.id}
    `;

    const jobDuration = Date.now() - jobStartTime;
    console.log(
      `[${jobStartTime}] [Worker] ✅ Job ${job.id} completed successfully in ${jobDuration}ms`,
    );

    return {
      id: job.id,
      status: "complete",
      duration: jobDuration,
    };
  } catch (error) {
    const jobDuration = Date.now() - jobStartTime;
    console.error(
      `[${jobStartTime}] [Worker] ❌ Job ${job.id} failed after ${jobDuration}ms:`,
      error.message,
    );
    console.error(`[${jobStartTime}] [Worker] Error stack:`, error.stack);

    // Check if this is a permanent failure that should not be retried
    const isPermanentFailure =
      error.message.toLowerCase().includes("alcohol") ||
      error.message.toLowerCase().includes("no water") ||
      error.message.toLowerCase().includes("not detect") ||
      error.message.toLowerCase().includes("invalid") ||
      error.message.toLowerCase().includes("no image data");

    // Check if we should retry or mark as permanently failed
    const shouldRetry =
      !isPermanentFailure && job.attempts + 1 < job.max_attempts;

    if (shouldRetry) {
      // Mark as pending for retry
      await sql`
        UPDATE jobs
        SET status = 'pending',
            error_message = ${error.message}
        WHERE id = ${job.id}
      `;
      console.log(
        `[${jobStartTime}] [Worker] Job ${job.id} will be retried (attempt ${job.attempts + 1}/${job.max_attempts})`,
      );
    } else {
      // Mark as permanently failed
      await sql`
        UPDATE jobs
        SET status = 'error',
            error_message = ${error.message},
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ${job.id}
      `;
      if (isPermanentFailure) {
        console.log(
          `[${jobStartTime}] [Worker] Job ${job.id} permanently failed (permanent error): ${error.message}`,
        );
      } else {
        console.log(
          `[${jobStartTime}] [Worker] Job ${job.id} permanently failed after ${job.attempts + 1} attempts`,
        );
      }
    }

    return {
      id: job.id,
      status: shouldRetry ? "retry" : "error",
      error: error.message,
      duration: jobDuration,
    };
  }
}
