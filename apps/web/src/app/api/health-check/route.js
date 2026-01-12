/**
 * Health check endpoint to verify the backend is running
 * This is useful for debugging mobile app connectivity issues
 */
export async function GET(request) {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    message: "Backend is running successfully!",
  });
}
