import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[API verify-code ${timestamp}] Request received`);

    const { email, code } = await request.json();

    if (!email || !code) {
      return Response.json(
        { error: "Email and code are required" },
        { status: 400 },
      );
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: "Invalid code format" }, { status: 400 });
    }

    // Find the most recent unverified code for this email
    const verificationRecord = await sql`
      SELECT * FROM email_verification_codes 
      WHERE email = ${normalizedEmail} 
      AND code = ${code}
      AND verified = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (verificationRecord.length === 0) {
      return Response.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    const record = verificationRecord[0];

    // Check if code has expired
    if (new Date() > new Date(record.expires_at)) {
      return Response.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 },
      );
    }

    // Mark code as verified
    await sql`
      UPDATE email_verification_codes 
      SET verified = TRUE 
      WHERE id = ${record.id}
    `;

    console.log(`[API verify-code ${timestamp}] ✅ Code verified successfully`);

    return Response.json({
      success: true,
      message: "Email verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error(`[API verify-code ${timestamp}] ❌ Error:`, error);
    return Response.json(
      { error: error.message || "Failed to verify code" },
      { status: 500 },
    );
  }
}
