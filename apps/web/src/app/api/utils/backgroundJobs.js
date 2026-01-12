// Phase 2: Simple in-memory background job processor
// Stores pending jobs and processes them asynchronously

const pendingJobs = new Map();
const processingJobs = new Set();

// Maximum queue size to prevent memory issues
const MAX_QUEUE_SIZE = 500;

export function addJob(jobId, jobData) {
  if (pendingJobs.size >= MAX_QUEUE_SIZE) {
    throw new Error("Job queue is full. Please try again later.");
  }

  pendingJobs.set(jobId, {
    ...jobData,
    status: "pending",
    createdAt: Date.now(),
  });

  console.log(`[Job ${jobId}] Added to queue. Queue size: ${pendingJobs.size}`);

  // Process immediately in background
  processJob(jobId).catch((error) => {
    console.error(`[Job ${jobId}] Processing failed:`, error);
  });

  return jobId;
}

export function getJobStatus(jobId) {
  const job = pendingJobs.get(jobId);

  if (!job) {
    return null;
  }

  return {
    status: job.status,
    result: job.result,
    error: job.error,
  };
}

export function deleteJob(jobId) {
  pendingJobs.delete(jobId);
  processingJobs.delete(jobId);
}

async function processJob(jobId) {
  const job = pendingJobs.get(jobId);

  if (!job) {
    console.log(`[Job ${jobId}] Not found in queue`);
    return;
  }

  if (processingJobs.has(jobId)) {
    console.log(`[Job ${jobId}] Already processing`);
    return;
  }

  processingJobs.add(jobId);
  job.status = "processing";

  try {
    console.log(`[Job ${jobId}] Starting processing...`);

    // Execute the job's processor function
    const result = await job.processor(job.data);

    job.status = "complete";
    job.result = result;
    job.completedAt = Date.now();

    console.log(
      `[Job ${jobId}] Completed in ${job.completedAt - job.createdAt}ms`,
    );

    // Clean up after 5 minutes
    setTimeout(() => deleteJob(jobId), 5 * 60 * 1000);
  } catch (error) {
    job.status = "error";
    job.error = error.message;
    job.completedAt = Date.now();

    console.error(`[Job ${jobId}] Failed:`, error);

    // Clean up failed jobs after 2 minutes
    setTimeout(() => deleteJob(jobId), 2 * 60 * 1000);
  } finally {
    processingJobs.delete(jobId);
  }
}

// Cleanup old jobs periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [jobId, job] of pendingJobs.entries()) {
    if (now - job.createdAt > maxAge) {
      console.log(`[Job ${jobId}] Cleaning up stale job`);
      deleteJob(jobId);
    }
  }
}, 60 * 1000); // Run every minute
