import crypto from "crypto";

// Global state for tracking requests and circuit breaker
const globalState = {
  // In-flight request tracking
  totalInFlight: 0,
  userInFlight: new Map(), // userId -> count

  // Deduplication cache (hash -> { result, timestamp })
  dedupeCache: new Map(),

  // Circuit breaker
  errorCount: 0,
  lastErrorReset: Date.now(),
  isOpen: false,

  // Idempotency cache (requestId -> result)
  idempotencyCache: new Map(),
};

// Configuration
const CONFIG = {
  MAX_TOTAL_IN_FLIGHT: 200, // Max concurrent OpenAI requests across all users
  MAX_USER_IN_FLIGHT: 1, // Max concurrent requests per user
  REQUEST_TIMEOUT_MS: 15000, // 15 second timeout
  DEDUPE_CACHE_TTL_MS: 5000, // Cache dedupe results for 5 seconds
  IDEMPOTENCY_CACHE_TTL_MS: 60000, // Cache idempotent results for 1 minute
  CIRCUIT_BREAKER_THRESHOLD: 10, // Open circuit after 10 errors
  CIRCUIT_BREAKER_RESET_MS: 30000, // Reset circuit after 30 seconds
  CIRCUIT_BREAKER_WINDOW_MS: 60000, // Count errors in 60 second window
};

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();

  // Clean dedupe cache
  for (const [hash, entry] of globalState.dedupeCache.entries()) {
    if (now - entry.timestamp > CONFIG.DEDUPE_CACHE_TTL_MS) {
      globalState.dedupeCache.delete(hash);
    }
  }

  // Clean idempotency cache
  for (const [requestId, entry] of globalState.idempotencyCache.entries()) {
    if (now - entry.timestamp > CONFIG.IDEMPOTENCY_CACHE_TTL_MS) {
      globalState.idempotencyCache.delete(requestId);
    }
  }
}, 10000); // Run every 10 seconds

/**
 * Hash input data for deduplication
 */
function hashInput(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(str).digest("hex");
}

/**
 * Check and update circuit breaker state
 */
function checkCircuitBreaker() {
  const now = Date.now();

  // Reset error count if window has passed
  if (now - globalState.lastErrorReset > CONFIG.CIRCUIT_BREAKER_WINDOW_MS) {
    globalState.errorCount = 0;
    globalState.lastErrorReset = now;
    globalState.isOpen = false;
  }

  // Check if circuit should be open
  if (
    globalState.errorCount >= CONFIG.CIRCUIT_BREAKER_THRESHOLD &&
    !globalState.isOpen
  ) {
    globalState.isOpen = true;
    console.error(
      `[CircuitBreaker] OPEN - ${globalState.errorCount} errors in window`,
    );
    setTimeout(() => {
      globalState.isOpen = false;
      globalState.errorCount = 0;
      console.log("[CircuitBreaker] HALF-OPEN - attempting recovery");
    }, CONFIG.CIRCUIT_BREAKER_RESET_MS);
  }

  if (globalState.isOpen) {
    throw new Error(
      "OpenAI service temporarily unavailable due to high error rate. Please try again in 30 seconds.",
    );
  }
}

/**
 * Record an error for circuit breaker
 */
function recordError() {
  globalState.errorCount++;
  console.log(
    `[CircuitBreaker] Error recorded: ${globalState.errorCount}/${CONFIG.CIRCUIT_BREAKER_THRESHOLD}`,
  );
}

/**
 * Check if user has capacity for new request
 */
function checkCapacity(userId) {
  // Check global capacity
  if (globalState.totalInFlight >= CONFIG.MAX_TOTAL_IN_FLIGHT) {
    throw new Error(
      "Server is currently processing maximum requests. Please try again in a moment.",
    );
  }

  // Check per-user capacity
  const userCount = globalState.userInFlight.get(userId) || 0;
  if (userCount >= CONFIG.MAX_USER_IN_FLIGHT) {
    throw new Error(
      "You have a request currently processing. Please wait for it to complete.",
    );
  }
}

/**
 * Increment in-flight counters
 */
function incrementInFlight(userId) {
  globalState.totalInFlight++;
  const userCount = globalState.userInFlight.get(userId) || 0;
  globalState.userInFlight.set(userId, userCount + 1);

  console.log(
    `[InFlight] Total: ${globalState.totalInFlight}, User ${userId}: ${userCount + 1}`,
  );
}

/**
 * Decrement in-flight counters
 */
function decrementInFlight(userId) {
  globalState.totalInFlight = Math.max(0, globalState.totalInFlight - 1);
  const userCount = globalState.userInFlight.get(userId) || 0;
  const newCount = Math.max(0, userCount - 1);

  if (newCount === 0) {
    globalState.userInFlight.delete(userId);
  } else {
    globalState.userInFlight.set(userId, newCount);
  }

  console.log(
    `[InFlight] Total: ${globalState.totalInFlight}, User ${userId}: ${newCount}`,
  );
}

/**
 * Main function to safely execute OpenAI request with all safety features
 */
export async function safeOpenAIRequest({
  userId,
  requestId, // Optional: for idempotency
  dedupeKey, // Optional: for deduplication (e.g., image hash)
  operation, // Async function that makes the OpenAI call
  operationName = "OpenAI Request",
}) {
  const timestamp = Date.now();
  console.log(
    `[${timestamp}] [${operationName}] Starting for user ${userId}...`,
  );

  try {
    // 1. Check circuit breaker
    checkCircuitBreaker();

    // 2. Check idempotency cache (if requestId provided)
    if (requestId && globalState.idempotencyCache.has(requestId)) {
      const cached = globalState.idempotencyCache.get(requestId);
      console.log(
        `[${timestamp}] [${operationName}] ✅ Returning cached result (idempotent)`,
      );
      return cached.result;
    }

    // 3. Check deduplication cache (if dedupeKey provided)
    if (dedupeKey) {
      const hash = hashInput(dedupeKey);
      if (globalState.dedupeCache.has(hash)) {
        const cached = globalState.dedupeCache.get(hash);
        console.log(
          `[${timestamp}] [${operationName}] ✅ Returning cached result (dedupe)`,
        );
        return cached.result;
      }
    }

    // 4. Check capacity
    checkCapacity(userId);

    // 5. Increment in-flight counters
    incrementInFlight(userId);

    try {
      // 6. Execute operation with timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Request timeout after ${CONFIG.REQUEST_TIMEOUT_MS}ms`,
                ),
              ),
            CONFIG.REQUEST_TIMEOUT_MS,
          ),
        ),
      ]);

      // 7. Cache result for deduplication
      if (dedupeKey) {
        const hash = hashInput(dedupeKey);
        globalState.dedupeCache.set(hash, {
          result,
          timestamp: Date.now(),
        });
      }

      // 8. Cache result for idempotency
      if (requestId) {
        globalState.idempotencyCache.set(requestId, {
          result,
          timestamp: Date.now(),
        });
      }

      console.log(
        `[${timestamp}] [${operationName}] ✅ Completed successfully`,
      );
      return result;
    } finally {
      // Always decrement counters
      decrementInFlight(userId);
    }
  } catch (error) {
    // Record error for circuit breaker (but not for timeout/capacity errors)
    if (
      !error.message.includes("timeout") &&
      !error.message.includes("capacity") &&
      !error.message.includes("processing maximum requests") &&
      !error.message.includes("request currently processing")
    ) {
      recordError();
    }

    console.error(`[${timestamp}] [${operationName}] ❌ Error:`, error.message);
    throw error;
  }
}

/**
 * Get current state for monitoring
 */
export function getState() {
  return {
    totalInFlight: globalState.totalInFlight,
    userInFlightCount: globalState.userInFlight.size,
    dedupeCacheSize: globalState.dedupeCache.size,
    idempotencyCacheSize: globalState.idempotencyCache.size,
    circuitBreakerOpen: globalState.isOpen,
    errorCount: globalState.errorCount,
  };
}

/**
 * Reset circuit breaker manually (for admin use)
 */
export function resetCircuitBreaker() {
  globalState.isOpen = false;
  globalState.errorCount = 0;
  globalState.lastErrorReset = Date.now();
  console.log("[CircuitBreaker] Manually reset");
}
