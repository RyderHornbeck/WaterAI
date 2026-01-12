import { useAuthStore } from "./auth/store";

/**
 * Fetch wrapper that automatically includes the JWT in the Authorization header
 *
 * For internal API calls, this constructs the full URL using environment variables
 * and includes the user's authentication token.
 */
export async function fetchWithAuth(url, options = {}) {
  const { auth } = useAuthStore.getState();
  const jwt = auth?.jwt;

  // Get base URL from environment variables
  const baseUrl =
    process.env.EXPO_PUBLIC_PROXY_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL;

  // Construct full URL only if url is relative (doesn't start with http)
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add JWT to Authorization header if available
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
}

/**
 * Hook version for use in components
 */
export function useFetchWithAuth() {
  return fetchWithAuth;
}
