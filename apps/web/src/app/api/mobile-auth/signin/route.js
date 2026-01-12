import { verify } from "argon2";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(
      `[API mobile-auth/signin ${timestamp}] ========== SIGNIN REQUEST START ==========`,
    );

    // Step 1: Parse request body
    let email, password;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 1: Parsed request body`,
        {
          hasEmail: !!email,
          emailLength: email?.length,
          hasPassword: !!password,
          passwordLength: password?.length,
        },
      );
    } catch (parseError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 1 FAILED: Could not parse JSON`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] Parse error:`,
        JSON.stringify(
          {
            name: parseError.name,
            message: parseError.message,
            stack: parseError.stack,
          },
          null,
          2,
        ),
      );
      return Response.json(
        { error: `Failed to parse request: ${parseError.message}` },
        { status: 400 },
      );
    }

    // Step 2: Input validation
    if (!email || !password) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 2 FAILED: Missing credentials`,
        {
          hasEmail: !!email,
          hasPassword: !!password,
        },
      );
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Step 3: Normalize and validate email format
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 3 FAILED: Invalid email format`,
        {
          originalEmail: email,
          normalizedEmail: normalizedEmail,
        },
      );
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
    console.log(
      `[API mobile-auth/signin ${timestamp}] ✅ Step 3: Email validated`,
      {
        normalizedEmail,
      },
    );

    // Step 4: Password validation
    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128
    ) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 4 FAILED: Invalid password`,
        {
          passwordType: typeof password,
          passwordLength: password?.length,
        },
      );
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }
    console.log(
      `[API mobile-auth/signin ${timestamp}] ✅ Step 4: Password validated`,
    );

    // Step 5: Find user
    let userResult;
    try {
      console.log(
        `[API mobile-auth/signin ${timestamp}] Step 5: Querying database for user...`,
      );
      userResult = await sql`
        SELECT * FROM auth_users WHERE email = ${normalizedEmail}
      `;
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 5: Database query complete`,
        {
          rowsFound: userResult.length,
        },
      );
    } catch (dbError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 5 FAILED: Database error when finding user`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] DB Error details:`,
        JSON.stringify(
          {
            name: dbError.name,
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            stack: dbError.stack,
            ...dbError,
          },
          null,
          2,
        ),
      );
      return Response.json(
        {
          error: `Database error when finding user: ${dbError.message}\nCode: ${dbError.code}\nDetail: ${dbError.detail || "none"}`,
        },
        { status: 503 },
      );
    }

    if (userResult.length === 0) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 5: User not found`,
        {
          email: normalizedEmail,
        },
      );
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = userResult[0];
    console.log(`[API mobile-auth/signin ${timestamp}] ✅ Step 5: User found`, {
      userId: user.id,
      userEmail: user.email,
    });

    // Step 6: Find account with password
    let accountResult;
    try {
      console.log(
        `[API mobile-auth/signin ${timestamp}] Step 6: Querying for account credentials...`,
      );
      accountResult = await sql`
        SELECT * FROM auth_accounts 
        WHERE "userId" = ${user.id} AND provider = ${"credentials"}
      `;
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 6: Account query complete`,
        {
          accountsFound: accountResult.length,
          hasPassword: accountResult[0]?.password ? true : false,
        },
      );
    } catch (dbError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 6 FAILED: Database error when finding account`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] DB Error details:`,
        JSON.stringify(
          {
            name: dbError.name,
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            stack: dbError.stack,
            ...dbError,
          },
          null,
          2,
        ),
      );
      return Response.json(
        {
          error: `Database error when finding account: ${dbError.message}\nCode: ${dbError.code}\nDetail: ${dbError.detail || "none"}`,
        },
        { status: 503 },
      );
    }

    if (accountResult.length === 0 || !accountResult[0].password) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 6: Account not found or no password`,
        {
          accountsFound: accountResult.length,
          hasPassword: accountResult[0]?.password ? true : false,
        },
      );
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const account = accountResult[0];

    // Step 7: Verify password
    let isValid;
    try {
      console.log(
        `[API mobile-auth/signin ${timestamp}] Step 7: Verifying password with argon2...`,
      );
      isValid = await verify(account.password, password);
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 7: Password verification complete`,
        {
          isValid,
        },
      );
    } catch (verifyError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 7 FAILED: Argon2 verification error`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] Verify error:`,
        JSON.stringify(
          {
            name: verifyError.name,
            message: verifyError.message,
            stack: verifyError.stack,
            ...verifyError,
          },
          null,
          2,
        ),
      );
      return Response.json(
        { error: `Password verification failed: ${verifyError.message}` },
        { status: 500 },
      );
    }

    if (!isValid) {
      console.log(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 7: Invalid password`,
      );
      return Response.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Step 8: Create session token
    let sessionToken, expires;
    try {
      console.log(
        `[API mobile-auth/signin ${timestamp}] Step 8: Creating session token...`,
      );
      sessionToken = globalThis.crypto.randomUUID();
      expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 8: Session token generated`,
        {
          tokenLength: sessionToken.length,
          expiresAt: expires.toISOString(),
        },
      );
    } catch (tokenError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 8 FAILED: Token generation error`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] Token error:`,
        JSON.stringify(
          {
            name: tokenError.name,
            message: tokenError.message,
            stack: tokenError.stack,
            ...tokenError,
          },
          null,
          2,
        ),
      );
      return Response.json(
        { error: `Failed to generate session token: ${tokenError.message}` },
        { status: 500 },
      );
    }

    // Step 9: Insert session into database
    try {
      console.log(
        `[API mobile-auth/signin ${timestamp}] Step 9: Inserting session into database...`,
      );
      await sql`
        INSERT INTO auth_sessions ("userId", expires, "sessionToken") 
        VALUES (${user.id}, ${expires}, ${sessionToken})
      `;
      console.log(
        `[API mobile-auth/signin ${timestamp}] ✅ Step 9: Session inserted successfully`,
      );
    } catch (dbError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] ❌ Step 9 FAILED: Database error when creating session`,
      );
      console.error(
        `[API mobile-auth/signin ${timestamp}] DB Error details:`,
        JSON.stringify(
          {
            name: dbError.name,
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            stack: dbError.stack,
            ...dbError,
          },
          null,
          2,
        ),
      );
      return Response.json(
        {
          error: `Database error when creating session: ${dbError.message}\nCode: ${dbError.code}\nDetail: ${dbError.detail || "none"}`,
        },
        { status: 503 },
      );
    }

    console.log(
      `[API mobile-auth/signin ${timestamp}] ✅✅✅ SIGNIN SUCCESSFUL!`,
      {
        userId: user.id,
        tokenLength: sessionToken.length,
      },
    );
    console.log(
      `[API mobile-auth/signin ${timestamp}] ========== SIGNIN REQUEST END ==========`,
    );

    // Return the session token as the JWT - mobile app will store it
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      jwt: sessionToken,
    });
  } catch (error) {
    console.error(
      `[API mobile-auth/signin ${timestamp}] ❌❌❌ UNEXPECTED ERROR CAUGHT`,
    );
    console.error(
      `[API mobile-auth/signin ${timestamp}] Error type:`,
      typeof error,
    );
    console.error(
      `[API mobile-auth/signin ${timestamp}] Error name:`,
      error?.name,
    );
    console.error(
      `[API mobile-auth/signin ${timestamp}] Error message:`,
      error?.message,
    );
    console.error(
      `[API mobile-auth/signin ${timestamp}] Error stack:`,
      error?.stack,
    );

    // Try to serialize the entire error object
    try {
      console.error(
        `[API mobile-auth/signin ${timestamp}] Full error object:`,
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      );
    } catch (serializeError) {
      console.error(
        `[API mobile-auth/signin ${timestamp}] Could not serialize error:`,
        serializeError.message,
      );
    }

    // Build comprehensive error message
    const errorDetails = {
      type: error?.constructor?.name || typeof error,
      name: error?.name || "Unknown",
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      position: error?.position,
      internalPosition: error?.internalPosition,
      internalQuery: error?.internalQuery,
      where: error?.where,
      schema: error?.schema,
      table: error?.table,
      column: error?.column,
      dataType: error?.dataType,
      constraint: error?.constraint,
    };

    const errorMessage =
      `SIGNIN ERROR: ${errorDetails.name}: ${errorDetails.message}\n\n` +
      `Type: ${errorDetails.type}\n` +
      (errorDetails.code ? `Code: ${errorDetails.code}\n` : "") +
      (errorDetails.detail ? `Detail: ${errorDetails.detail}\n` : "") +
      (errorDetails.hint ? `Hint: ${errorDetails.hint}\n` : "") +
      (errorDetails.table ? `Table: ${errorDetails.table}\n` : "") +
      (errorDetails.column ? `Column: ${errorDetails.column}\n` : "") +
      `\nStack trace (first 500 chars):\n${error?.stack?.substring(0, 500) || "No stack trace"}`;

    console.error(
      `[API mobile-auth/signin ${timestamp}] Returning detailed error to client`,
    );

    return Response.json(
      {
        error: errorMessage,
        errorDetails: errorDetails,
      },
      { status: 500 },
    );
  }
}
