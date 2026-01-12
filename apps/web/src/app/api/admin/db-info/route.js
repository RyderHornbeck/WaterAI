import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    // Get database name and connection info
    const dbInfo = await sql`
      SELECT 
        current_database() as database_name,
        current_user as connected_user,
        version() as postgres_version
    `;

    // Get database size
    const dbSize = await sql`
      SELECT 
        pg_database.datname as database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) as size_pretty,
        pg_database_size(pg_database.datname) as size_bytes
      FROM pg_database
      WHERE datname = current_database()
    `;

    // Get table sizes
    const tableSizes = await sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_total_relation_size(schemaname||'.'||tablename) as total_bytes,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    // Get row counts for main tables
    const rowCounts = await sql`
      SELECT 
        'jobs' as table_name,
        COUNT(*) as row_count
      FROM jobs
      UNION ALL
      SELECT 'water_entries', COUNT(*) FROM water_entries
      UNION ALL
      SELECT 'auth_users', COUNT(*) FROM auth_users
      UNION ALL
      SELECT 'user_bottles', COUNT(*) FROM user_bottles
      UNION ALL
      SELECT 'barcode_cache', COUNT(*) FROM barcode_cache
      UNION ALL
      SELECT 'daily_water_aggregates', COUNT(*) FROM daily_water_aggregates
      UNION ALL
      SELECT 'user_settings', COUNT(*) FROM user_settings
      ORDER BY row_count DESC
    `;

    // Get job breakdown by status
    const jobStatusBreakdown = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM jobs
      GROUP BY status
      ORDER BY count DESC
    `;

    // Check for Neon-specific storage limits (if available)
    let storageLimit = null;
    try {
      const neonInfo = await sql`
        SELECT 
          setting as max_wal_size
        FROM pg_settings 
        WHERE name = 'max_wal_size'
      `;
      storageLimit = neonInfo[0]?.max_wal_size || "Unknown";
    } catch (e) {
      storageLimit = "Unable to determine";
    }

    // Get DATABASE_URL info (without exposing the actual URL)
    const dbUrlInfo = {
      isSet: !!process.env.DATABASE_URL,
      host: process.env.DATABASE_URL
        ? new URL(process.env.DATABASE_URL).host
        : "Not set",
      // Don't expose full URL for security
    };

    return Response.json({
      connection: dbInfo[0],
      database: dbSize[0],
      tables: tableSizes,
      rowCounts,
      jobStatusBreakdown,
      storageLimit,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appEnv: process.env.ENV,
        databaseUrlConfigured: dbUrlInfo,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DB Info] Error:", error);
    return Response.json(
      {
        error: "Failed to get database info",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
