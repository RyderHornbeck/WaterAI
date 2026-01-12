import sql from "@/app/api/utils/sql";

/**
 * Validates a session token and returns the associated user
 * @param {string} token - The session token to validate
 * @returns {Promise<Object|null>} User object if valid, null if invalid
 */
export async function validateToken(token) {
  if (!token) {
    return null;
  }

  try {
    // Find session with this token that hasn't expired
    const sessions = await sql`
      SELECT s.*, u.id, u.name, u.email, u.image
      FROM auth_sessions s
      JOIN auth_users u ON s."userId" = u.id
      WHERE s."sessionToken" = ${token}
      AND s.expires > NOW()
    `;

    if (sessions.length === 0) {
      return null;
    }

    const session = sessions[0];

    return {
      id: session.id,
      name: session.name,
      email: session.email,
      image: session.image,
    };
  } catch (error) {
    console.error("[validateToken] Error validating token:", error);
    return null;
  }
}

/**
 * Extract token from request Authorization header
 * @param {Request} request - The request object
 * @returns {string|null} Token if found, null otherwise
 */
export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and just "token"
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return authHeader;
}
