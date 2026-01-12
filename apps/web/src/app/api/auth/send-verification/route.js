import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";

export async function POST(request) {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[API send-verification ${timestamp}] Request received`);

    const { email, name } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return Response.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }

    // Check if email is already registered
    const existingUser = await sql`
      SELECT id FROM auth_users WHERE email = ${normalizedEmail}
    `;

    if (existingUser.length > 0) {
      return Response.json(
        { error: "This email is already registered" },
        { status: 400 },
      );
    }

    // Rate limiting: Check recent verification requests
    const recentRequests = await sql`
      SELECT COUNT(*) as count FROM email_verification_codes 
      WHERE email = ${normalizedEmail} 
      AND created_at > NOW() - INTERVAL '1 minute'
    `;

    if (parseInt(recentRequests[0].count) > 3) {
      return Response.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any previous codes for this email
    await sql`
      UPDATE email_verification_codes 
      SET verified = TRUE 
      WHERE email = ${normalizedEmail} AND verified = FALSE
    `;

    // Store the code
    await sql`
      INSERT INTO email_verification_codes (email, code, expires_at)
      VALUES (${normalizedEmail}, ${code}, ${expiresAt})
    `;

    console.log(
      `[API send-verification ${timestamp}] Sending email to ${normalizedEmail} with code ${code}`,
    );

    // Send email with verification code
    try {
      await sendEmail({
        to: normalizedEmail,
        from: "Water AI <onboarding@resend.dev>",
        subject: "Your Water AI Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 40px; border-radius: 0 0 10px 10px; }
              .code-box { background: white; border: 2px solid #0EA5E9; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0; }
              .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0EA5E9; }
              .footer { color: #6b7280; font-size: 14px; margin-top: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">💧 Water AI</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
              </div>
              <div class="content">
                <p style="font-size: 16px; color: #374151;">Hello${name ? ` ${name}` : ""}!</p>
                <p style="font-size: 16px; color: #374151;">Thanks for signing up for Water AI. Please use the verification code below to complete your registration:</p>
                
                <div class="code-box">
                  <div class="code">${code}</div>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #6b7280;">If you didn't request this code, you can safely ignore this email.</p>
                
                <div class="footer">
                  <p>Stay hydrated, stay healthy! 💙</p>
                  <p>— The Water AI Team</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Your Water AI verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
      });

      console.log(
        `[API send-verification ${timestamp}] ✅ Code sent successfully`,
      );

      return Response.json({
        success: true,
        message: "Verification code sent to your email",
      });
    } catch (emailError) {
      console.error(
        `[API send-verification ${timestamp}] Email send error:`,
        emailError,
      );

      // Check for specific Resend errors
      const errorMessage = emailError.message || "";

      if (
        errorMessage.includes("verify a domain") ||
        errorMessage.includes("testing emails")
      ) {
        return Response.json(
          {
            error:
              "Email service requires domain verification. Please contact support or use the testing email address.",
            details:
              "To send emails in production, verify your domain at resend.com/domains",
          },
          { status: 500 },
        );
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("Authorization")
      ) {
        return Response.json(
          {
            error:
              "Email service not configured. Please add your RESEND_API_KEY.",
          },
          { status: 500 },
        );
      }

      return Response.json(
        {
          error: "Failed to send verification email. Please try again.",
          details: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(`[API send-verification ${timestamp}] ❌ Error:`, error);
    return Response.json(
      { error: error.message || "Failed to send verification code" },
      { status: 500 },
    );
  }
}
