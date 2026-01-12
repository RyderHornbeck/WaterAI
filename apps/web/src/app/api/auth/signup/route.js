import { hash } from "argon2";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[API auth/signup ${timestamp}] Signup request received`);

    const { email, password, name } = await request.json();

    console.log(`[API auth/signup ${timestamp}] Request data:`, {
      email,
      hasPassword: !!password,
      name,
    });

    // Input validation
    if (!email || !password) {
      console.log(`[API auth/signup ${timestamp}] Missing email or password`);
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Normalize email and validate format
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.log(`[API auth/signup ${timestamp}] Invalid email format`);
      return Response.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    // Password validation
    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128
    ) {
      console.log(`[API auth/signup ${timestamp}] Invalid password length`);
      return Response.json(
        { error: "Password must be between 6 and 128 characters" },
        { status: 400 },
      );
    }

    // Name validation
    const normalizedName = name ? name.trim() : null;
    if (
      normalizedName &&
      (normalizedName.length < 2 || normalizedName.length > 50)
    ) {
      console.log(`[API auth/signup ${timestamp}] Invalid name length`);
      return Response.json(
        { error: "Name must be between 2 and 50 characters" },
        { status: 400 },
      );
    }

    // Check if user already exists (using parameterized query to prevent SQL injection)
    console.log(`[API auth/signup ${timestamp}] Checking if user exists...`);
    const existingUser = await sql`
      SELECT * FROM auth_users WHERE email = ${normalizedEmail}
    `;

    if (existingUser.length > 0) {
      console.log(`[API auth/signup ${timestamp}] User already exists`);
      return Response.json({ error: "User already exists" }, { status: 400 });
    }

    // Create new user
    console.log(`[API auth/signup ${timestamp}] Creating new user...`);
    const newUser = await sql`
      INSERT INTO auth_users (name, email, "emailVerified", image) 
      VALUES (${normalizedName || null}, ${normalizedEmail}, ${null}, ${null}) 
      RETURNING id, name, email, "emailVerified", image
    `;

    const user = newUser[0];
    console.log(`[API auth/signup ${timestamp}] User created:`, {
      id: user.id,
      email: user.email,
    });

    // Hash password and create account
    console.log(`[API auth/signup ${timestamp}] Hashing password...`);
    const hashedPassword = await hash(password);
    console.log(`[API auth/signup ${timestamp}] Creating account...`);

    await sql`
      INSERT INTO auth_accounts ("userId", provider, type, "providerAccountId", password)
      VALUES (${user.id}, ${"credentials"}, ${"credentials"}, ${user.id}, ${hashedPassword})
    `;

    // Create session token - this is our auth token!
    console.log(`[API auth/signup ${timestamp}] Creating session token...`);
    const sessionToken = globalThis.crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO auth_sessions ("userId", expires, "sessionToken") 
      VALUES (${user.id}, ${expires}, ${sessionToken})
    `;

    // Verify user was created successfully by reading it back
    console.log(`[API auth/signup ${timestamp}] Verifying user creation...`);
    const verifyUser = await sql`
      SELECT id, email, name FROM auth_users WHERE id = ${user.id}
    `;

    if (verifyUser.length === 0) {
      throw new Error("User creation verification failed");
    }

    console.log(`[API auth/signup ${timestamp}] ✅ Signup successful!`, {
      userId: user.id,
      tokenLength: sessionToken.length,
    });

    // Return the session token as the JWT
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwt: sessionToken,
    });
  } catch (error) {
    console.error(`[API auth/signup ${timestamp}] ❌ Signup error:`, error);
    console.error(`[API auth/signup ${timestamp}] Error name:`, error.name);
    console.error(
      `[API auth/signup ${timestamp}] Error message:`,
      error.message,
    );
    console.error(`[API auth/signup ${timestamp}] Error stack:`, error.stack);

    // Return specific error messages based on error type
    let errorMessage = "Failed to create account";
    let statusCode = 500;

    // Check for specific error types
    if (
      error.message.includes("duplicate key") ||
      error.message.includes("unique constraint")
    ) {
      errorMessage = "An account with this email already exists";
      statusCode = 400;
    } else if (error.message.includes("validation")) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (
      error.message.includes("database") ||
      error.message.includes("connection")
    ) {
      errorMessage = "Database connection error. Please try again.";
      statusCode = 503;
    } else if (error.message.includes("timeout")) {
      errorMessage = "Request timed out. Please try again.";
      statusCode = 408;
    } else {
      // For unexpected errors, include the actual error message for debugging
      errorMessage = `Failed to create account: ${error.message}`;
    }

    console.error(
      `[API auth/signup ${timestamp}] Returning error: ${errorMessage} (${statusCode})`,
    );

    return Response.json({ error: errorMessage }, { status: statusCode });
  }
}
