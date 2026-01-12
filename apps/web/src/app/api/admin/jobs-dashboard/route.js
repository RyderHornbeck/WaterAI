import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const jobType = searchParams.get("jobType") || null;
    const status = searchParams.get("status") || null;

    // Build the query dynamically
    let query = "SELECT * FROM jobs WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (jobType) {
      query += ` AND job_type = $${paramIndex}`;
      params.push(jobType);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const jobs = await sql(query, params);

    // Get user emails for each job
    const userIds = [...new Set(jobs.map((j) => j.user_id))];
    const users = await sql`
      SELECT id, email, name 
      FROM auth_users 
      WHERE id = ANY(${userIds})
    `;

    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = { email: u.email, name: u.name };
    });

    // Enrich jobs with user info
    const enrichedJobs = jobs.map((job) => ({
      ...job,
      user: userMap[job.user_id] || null,
    }));

    return Response.json({ jobs: enrichedJobs }, { status: 200 });
  } catch (error) {
    console.error("[jobs-dashboard] Error:", error);
    return Response.json(
      { error: "Failed to fetch jobs", details: error.message },
      { status: 500 },
    );
  }
}
