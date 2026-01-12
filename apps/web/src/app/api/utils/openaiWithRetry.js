// Utility for making OpenAI API calls with automatic retry on rate limits
// Implements exponential backoff with jitter to handle rate limit errors

/**
 * Makes an OpenAI API call with automatic retry on rate limit errors
 * @param {string} url - The OpenAI API endpoint
 * @param {object} body - The request body
 * @param {number} maxRetries - Maximum number of retries (default: 5)
 * @returns {Promise<object>} The API response data
 */
export async function callOpenAIWithRetry(url, body, maxRetries = 5) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      // If successful, return the data
      if (response.ok) {
        return await response.json();
      }

      const errorData = await response.json();

      // Check if it's a rate limit error
      const isRateLimitError =
        response.status === 429 ||
        errorData.error?.message?.toLowerCase().includes("rate limit") ||
        errorData.error?.type === "rate_limit_error";

      if (!isRateLimitError) {
        // Not a rate limit error, throw immediately
        throw new Error(errorData.error?.message || "OpenAI API call failed");
      }

      // It's a rate limit error, prepare to retry
      lastError = new Error(errorData.error?.message || "Rate limit exceeded");

      // Calculate backoff with exponential increase + jitter
      // Attempt 0: 100-200ms
      // Attempt 1: 200-400ms
      // Attempt 2: 400-800ms
      // Attempt 3: 800-1600ms
      // Attempt 4: 1600-3200ms
      const baseDelay = 100 * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelay;
      const delay = baseDelay + jitter;

      console.log(
        `[OpenAI] Rate limit hit (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(delay)}ms...`,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      // Network error or non-rate-limit error
      if (
        !error.message.includes("rate limit") &&
        !error.message.includes("Rate limit")
      ) {
        throw error;
      }
      lastError = error;
    }
  }

  // All retries exhausted
  throw new Error(
    `OpenAI rate limit exceeded after ${maxRetries} retries: ${lastError.message}`,
  );
}
