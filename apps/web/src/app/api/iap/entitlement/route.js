/**
 * GET /api/iap/entitlement
 *
 * Returns current entitlement state for the authenticated user
 * This is the source of truth for premium access in the app
 */

import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    console.log(`[IAP] Fetching entitlement for user ${userId}`);

    // Query subscription from database
    const [subscription] = await sql`
      SELECT 
        id, user_id, platform, original_transaction_id,
        latest_transaction_id, product_id, status, expires_at,
        auto_renew_status, environment, last_verified_at,
        created_at, updated_at
      FROM user_subscriptions
      WHERE user_id = ${userId}
      AND platform = 'ios'
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    // No subscription found
    if (!subscription) {
      console.log(`[IAP] No subscription found for user ${userId}`);
      return Response.json({
        isPremium: false,
        status: "none",
        reason: "No subscription found",
      });
    }

    // Check if subscription is still active
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const isPremium = expiresAt > now && subscription.status === "active";

    // Check if verification is stale (older than 24 hours)
    const lastVerified = new Date(subscription.last_verified_at);
    const hoursSinceVerification = (now - lastVerified) / (1000 * 60 * 60);
    const needsRefresh = hoursSinceVerification > 24;

    console.log(`[IAP] Entitlement state for user ${userId}:`, {
      isPremium,
      status: subscription.status,
      expiresAt,
      hoursSinceVerification,
      needsRefresh,
    });

    return Response.json({
      isPremium,
      status: subscription.status,
      productId: subscription.product_id,
      expiresAt: subscription.expires_at,
      autoRenewStatus: subscription.auto_renew_status,
      environment: subscription.environment,
      lastVerifiedAt: subscription.last_verified_at,
      needsRefresh,
      originalTransactionId: subscription.original_transaction_id,
    });
  } catch (error) {
    console.error("[IAP] Entitlement fetch error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
