import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  const session = await auth();

  // Return server-side environment variables
  const envVars = {
    // Core environment
    NODE_ENV: process.env.NODE_ENV || "Not set",
    ENV: process.env.ENV || "Not set",

    // Base URLs
    APP_URL: process.env.APP_URL || "Not set",
    EXPO_PUBLIC_PROXY_BASE_URL:
      process.env.EXPO_PUBLIC_PROXY_BASE_URL || "Not set",
    EXPO_PUBLIC_BASE_URL: process.env.EXPO_PUBLIC_BASE_URL || "Not set",
    AUTH_URL: process.env.AUTH_URL || "Not set",

    // Upload and services
    EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY: process.env
      .EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY
      ? "Set (hidden)"
      : "Not set",

    // Google Maps
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      ? "Set (hidden)"
      : "Not set",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? "Set (hidden)"
      : "Not set",

    // RevenueCat
    EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY: process.env
      .EXPO_PUBLIC_REVENUECAT_PUBLIC_SDK_KEY
      ? "Set (hidden)"
      : "Not set",
    EXPO_PUBLIC_REVENUECAT_WEB_BILLING_KEY: process.env
      .EXPO_PUBLIC_REVENUECAT_WEB_BILLING_KEY
      ? "Set (hidden)"
      : "Not set",
    REVENUE_CAT_API_KEY: process.env.REVENUE_CAT_API_KEY
      ? "Set (hidden)"
      : "Not set",
    REVENUE_CAT_PROJECT_ID: process.env.REVENUE_CAT_PROJECT_ID
      ? "Set (hidden)"
      : "Not set",

    // Environment type
    EXPO_PUBLIC_CREATE_ENV: process.env.EXPO_PUBLIC_CREATE_ENV || "Not set",

    // API Keys (hidden for security)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "Set (hidden)" : "Not set",
    GOOGLE_VISION_API_KEY: process.env.GOOGLE_VISION_API_KEY
      ? "Set (hidden)"
      : "Not set",
    SERP_API_KEY: process.env.SERP_API_KEY ? "Set (hidden)" : "Not set",

    // Database
    DATABASE_URL: process.env.DATABASE_URL ? "Set (hidden)" : "Not set",

    // Auth
    AUTH_SECRET: process.env.AUTH_SECRET ? "Set (hidden)" : "Not set",

    // Stripe
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY
      ? "Set (hidden)"
      : "Not set",

    // R2 Storage
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ? "Set (hidden)" : "Not set",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "Set (hidden)" : "Not set",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY
      ? "Set (hidden)"
      : "Not set",
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "Not set",
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "Not set",
  };

  // Add diagnostics data
  const diagnostics = {
    timestamp: new Date().toISOString(),
    auth: {
      sessionExists: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
    },
    database: {
      connected: false,
      error: null,
      tableCount: 0,
    },
    logs: [],
  };

  // Test database connection
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    diagnostics.database.connected = true;
    diagnostics.database.tableCount = tables.length;
    diagnostics.logs.push({
      level: "success",
      message: `✅ Database connected: ${tables.length} tables found`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    diagnostics.database.error = error.message;
    diagnostics.logs.push({
      level: "error",
      message: `❌ Database error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }

  // Check for recent failed jobs
  if (diagnostics.database.connected) {
    try {
      const failedJobs = await sql`
        SELECT id, user_id, job_type, error_message, created_at
        FROM jobs
        WHERE status = 'error'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      if (failedJobs.length > 0) {
        diagnostics.logs.push({
          level: "warning",
          message: `⚠️ Found ${failedJobs.length} recent failed jobs`,
          timestamp: new Date().toISOString(),
          data: failedJobs.map((job) => ({
            id: job.id,
            userId: job.user_id,
            type: job.job_type,
            error: job.error_message,
            time: job.created_at,
          })),
        });
      } else {
        diagnostics.logs.push({
          level: "success",
          message: "✅ No recent failed jobs",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      diagnostics.logs.push({
        level: "error",
        message: `❌ Failed to check jobs: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for stuck jobs
    try {
      const stuckJobs = await sql`
        SELECT id, user_id, job_type, started_at, created_at
        FROM jobs
        WHERE status = 'processing'
        AND started_at < NOW() - INTERVAL '5 minutes'
        ORDER BY started_at DESC
        LIMIT 10
      `;

      if (stuckJobs.length > 0) {
        diagnostics.logs.push({
          level: "error",
          message: `❌ Found ${stuckJobs.length} jobs stuck in processing (>5min)`,
          timestamp: new Date().toISOString(),
          data: stuckJobs.map((job) => ({
            id: job.id,
            userId: job.user_id,
            type: job.job_type,
            startedAt: job.started_at,
            createdAt: job.created_at,
          })),
        });
      }
    } catch (error) {
      diagnostics.logs.push({
        level: "error",
        message: `❌ Failed to check stuck jobs: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check environment completeness
  const missingEnv = Object.entries(envVars)
    .filter(([key, value]) => !value || value === "Not set")
    .map(([key]) => key);

  if (missingEnv.length > 0) {
    diagnostics.logs.push({
      level: "warning",
      message: `⚠️ Missing ${missingEnv.length} environment variables`,
      timestamp: new Date().toISOString(),
      data: missingEnv,
    });
  }

  return Response.json({
    envVars,
    diagnostics,
  });
}
