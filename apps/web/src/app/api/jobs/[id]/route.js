import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  validateToken,
  getTokenFromRequest,
} from "@/app/api/utils/validateToken";

export async function GET(request, { params }) {
  const timestamp = Date.now();
  const { id } = params;

  try {
    console.log(`[${timestamp}] [job-status] Checking status for job ${id}`);

    const token = getTokenFromRequest(request);
    let userId = null;

    if (token) {
      const user = await validateToken(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const session = await auth();
      if (!session?.user?.id) {
        console.log(
          `[${timestamp}] [job-status] ❌ Unauthorized for job ${id}`,
        );
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = parseInt(session.user.id, 10);
    }

    // Fetch the job (ensure it belongs to this user)
    const jobs = await sql`
      SELECT id, job_type, status, result, error_message, created_at, started_at, completed_at, attempts
      FROM jobs
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (jobs.length === 0) {
      console.log(
        `[${timestamp}] [job-status] ❌ Job ${id} not found for user ${userId}`,
      );
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    const job = jobs[0];
    console.log(
      `[${timestamp}] [job-status] Job ${id} status: ${job.status}, attempts: ${job.attempts}`,
    );

    // Parse result if it exists (it's stored as JSON in the database)
    let parsedResult = null;
    if (job.result) {
      console.log(
        `[${timestamp}] [job-status] Job ${id} has result, type: ${typeof job.result}`,
      );
      try {
        parsedResult =
          typeof job.result === "string" ? JSON.parse(job.result) : job.result;
        console.log(`[${timestamp}] [job-status] ✅ Job ${id} result parsed:`, {
          ounces: parsedResult.ounces,
          classification: parsedResult.classification,
          liquidType: parsedResult.liquidType,
        });
      } catch (parseError) {
        console.error(
          `[${timestamp}] [job-status] ❌ Job ${id} Failed to parse result:`,
          parseError,
        );
        console.error(`[${timestamp}] [job-status] Raw result:`, job.result);
        parsedResult = job.result; // Return as-is if parsing fails
      }
    } else if (job.status === "complete") {
      console.log(
        `[${timestamp}] [job-status] ⚠️ Job ${id} marked complete but has no result!`,
      );
    }

    if (job.error_message) {
      console.log(
        `[${timestamp}] [job-status] Job ${id} has error: ${job.error_message}`,
      );
    }

    // Return job status
    return Response.json({
      id: job.id,
      jobType: job.job_type,
      status: job.status,
      result: parsedResult,
      error: job.error_message,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      attempts: job.attempts,
    });
  } catch (error) {
    console.error(
      `[${timestamp}] [job-status] ❌ Error fetching job ${id}:`,
      error,
    );
    console.error(`[${timestamp}] [job-status] Error stack:`, error.stack);
    return Response.json(
      { error: "Failed to fetch job status", details: error.message },
      { status: 500 },
    );
  }
}
