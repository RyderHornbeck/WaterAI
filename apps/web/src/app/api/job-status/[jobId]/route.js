import { getJobStatus } from "@/app/api/utils/backgroundJobs";

export async function GET(request, { params }) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return Response.json({ error: "Job ID is required" }, { status: 400 });
    }

    const status = getJobStatus(jobId);

    if (!status) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json(status);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return Response.json(
      { error: "Failed to fetch job status" },
      { status: 500 },
    );
  }
}
