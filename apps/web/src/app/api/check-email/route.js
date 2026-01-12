import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists with this email
    const users = await sql`
      SELECT id FROM auth_users WHERE email = ${email}
    `;

    return Response.json({ exists: users.length > 0 });
  } catch (error) {
    console.error("Error checking email:", error);
    return Response.json({ error: "Failed to check email" }, { status: 500 });
  }
}
