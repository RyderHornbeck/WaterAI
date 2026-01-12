import { neon, Pool } from "@neondatabase/serverless";

// Configuration constants
const QUERY_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 100;
const MAX_RETRY_DELAY_MS = 2000;

// Connection pool configuration
// Pool size guide:
// - Neon free tier: ~100 connections total (keep pool under 50)
// - Neon paid tier: 100-1000+ (can increase as needed)
// - Rule of thumb: (expected concurrent users / 10) but cap at 50% of DB limit
// - More connections = more memory usage
// - Start conservative, increase only if seeing "connection timeout" errors
const POOL_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum 20 connections in pool (conservative for most apps)
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout if can't get connection in 10s
};

// Transient error codes that should be retried
const RETRYABLE_ERROR_CODES = [
  "57P03", // cannot_connect_now
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "53300", // too_many_connections
  "55P03", // lock_not_available
];

// Check if error is retryable
function isRetryableError(error) {
  if (!error) return false;

  // Check for network errors
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ECONNRESET"
  ) {
    return true;
  }

  // Check for Postgres error codes
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true;
  }

  // Check error message for transient issues
  const message = error.message?.toLowerCase() || "";
  if (
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("unavailable") ||
    message.includes("too many")
  ) {
    return true;
  }

  return false;
}

// Sleep utility for retry delays
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff with jitter
function getRetryDelay(attemptNumber) {
  const baseDelay = Math.min(
    INITIAL_RETRY_DELAY_MS * Math.pow(2, attemptNumber),
    MAX_RETRY_DELAY_MS,
  );
  // Add jitter (±25%)
  const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
  return baseDelay + jitter;
}

// Enhanced query wrapper with timeout, retries, and error handling
async function executeQueryWithRetry(queryFn, queryDescription = "query") {
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Query timeout after ${QUERY_TIMEOUT_MS}ms: ${queryDescription}`,
            ),
          );
        }, QUERY_TIMEOUT_MS);
      });

      // Race between query and timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);

      return result;
    } catch (error) {
      lastError = error;

      // Log the error
      console.error(`Database error (attempt ${attempt + 1}/${MAX_RETRIES}):`, {
        query: queryDescription,
        error: error.message,
        code: error.code,
        retryable: isRetryableError(error),
      });

      // Check if we should retry
      if (attempt < MAX_RETRIES - 1 && isRetryableError(error)) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      throw error;
    }
  }

  throw lastError;
}

// Choose between Pool (WebSocket with connection pooling) or neon (HTTP)
// Pool is better for high concurrency but requires long-running Node.js process
// Use HTTP mode in serverless environments (Vercel, AWS Lambda, etc.)
const USE_POOLING = process.env.DATABASE_POOLING === "true";

let pool = null;
let rawSQL = null;

if (!process.env.DATABASE_URL) {
  console.warn("No DATABASE_URL provided");
} else if (USE_POOLING) {
  console.log("Using connection pooling (WebSocket mode)");
  pool = new Pool(POOL_CONFIG);

  // Wrapper to convert Pool.query to neon-like tagged template syntax
  rawSQL = async (strings, ...values) => {
    const client = await pool.connect();
    try {
      // Handle both tagged template and function call syntax
      if (typeof strings === "string") {
        const result = await client.query(strings, values[0] || []);
        return result.rows;
      } else {
        // Tagged template: convert to parameterized query
        let query = "";
        const params = [];
        strings.forEach((str, i) => {
          query += str;
          if (i < values.length) {
            params.push(values[i]);
            query += `$${params.length}`;
          }
        });
        const result = await client.query(query, params);
        return result.rows;
      }
    } finally {
      client.release();
    }
  };
} else {
  console.log("Using HTTP mode (no pooling)");
  rawSQL = neon(process.env.DATABASE_URL);
}

// Wrapper for tagged template queries with retry and timeout
const sql = rawSQL
  ? async (strings, ...values) => {
      if (!rawSQL) {
        throw new Error(
          "No database connection string was provided. Please set process.env.DATABASE_URL",
        );
      }

      // Check if called as a regular function (not tagged template)
      // If strings is a string (not an array), it's a function call
      if (typeof strings === "string") {
        const query = strings;
        const params = values[0] || [];
        return executeQueryWithRetry(
          () => rawSQL(query, params),
          query.substring(0, 100), // truncate for logging
        );
      }

      // Tagged template syntax
      return executeQueryWithRetry(
        () => rawSQL(strings, ...values),
        strings.join("?"),
      );
    }
  : () => {
      throw new Error(
        "No database connection string was provided to `neon()`. Perhaps process.env.DATABASE_URL has not been set",
      );
    };

// Add transaction support
sql.transaction = async (queries) => {
  if (!rawSQL) {
    throw new Error(
      "No database connection string was provided. Please set process.env.DATABASE_URL",
    );
  }

  return executeQueryWithRetry(async () => {
    if (USE_POOLING) {
      // Use proper transaction with Pool
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];

        for (const query of queries) {
          const result = await query;
          results.push(result);
        }

        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else {
      // HTTP mode transactions (less reliable)
      await rawSQL`BEGIN`;

      try {
        const results = [];

        // Execute all queries in sequence within the transaction
        for (const query of queries) {
          const result = await query;
          results.push(result);
        }

        // Commit transaction
        await rawSQL`COMMIT`;

        return results;
      } catch (error) {
        // Rollback on error
        await rawSQL`ROLLBACK`;
        throw error;
      }
    }
  }, "transaction");
};

// Graceful shutdown for connection pool
if (pool) {
  const cleanup = async () => {
    console.log("Closing database connection pool...");
    await pool.end();
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

export default sql;
