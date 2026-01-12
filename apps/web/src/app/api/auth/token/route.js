import { getToken } from "@auth/core/jwt";

export async function GET(request) {
  const timestamp = new Date().toISOString();

  console.log(`[API auth/token ${timestamp}] Token request received`);

  const [token, jwt] = await Promise.all([
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL.startsWith("https"),
      raw: true,
    }),
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.AUTH_URL.startsWith("https"),
    }),
  ]);

  if (!jwt) {
    console.error(`[API auth/token ${timestamp}] No JWT found - Unauthorized`);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  console.log(`[API auth/token ${timestamp}] Token generated for user`, {
    userId: jwt.sub,
    email: jwt.email,
    name: jwt.name,
  });

  return new Response(
    JSON.stringify({
      jwt: token,
      user: {
        id: jwt.sub,
        email: jwt.email,
        name: jwt.name,
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
