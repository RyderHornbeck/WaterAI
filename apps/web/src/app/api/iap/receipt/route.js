/**
 * POST /api/iap/receipt
 *
 * Receives iOS receipt from app, verifies with Apple, and updates user entitlement
 * This is the primary endpoint for establishing premium access
 */

import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  verifyAppleReceipt,
  extractSubscriptionInfo,
} from "@/app/api/iap/utils/appleVerify";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { receipt, transactionId, productId, platform = "ios" } = body;

    if (!receipt) {
      return Response.json({ error: "Receipt is required" }, { status: 400 });
    }

    console.log(
      `[IAP] Verifying receipt for user ${userId}, product: ${productId}`,
    );

    let verificationResult;
    try {
      verificationResult = await verifyAppleReceipt(receipt);
    } catch (error) {
      console.error("[IAP] Receipt verification failed:", error);

      await sql`
        INSERT INTO iap_events (
          user_id, event_type, platform, product_id, 
          transaction_id, raw_payload, status
        ) VALUES (
          ${userId}, 'receipt_verification_failed', ${platform}, 
          ${productId}, ${transactionId}, 
          ${JSON.stringify({ error: error.message })}, 'failed'
        )
      `;

      return Response.json(
        {
          error: "Receipt verification failed",
          details: error.message,
        },
        { status: 400 },
      );
    }

    const subscriptionInfo = extractSubscriptionInfo(verificationResult);

    console.log("[IAP] Subscription info:", {
      isPremium: subscriptionInfo.isPremium,
      status: subscriptionInfo.status,
      productId: subscriptionInfo.productId,
      expiresAt: subscriptionInfo.expiresAt,
    });

    await sql.transaction(async (txn) => {
      await txn`
        INSERT INTO user_subscriptions (
          user_id, platform, original_transaction_id, latest_transaction_id,
          product_id, status, expires_at, auto_renew_status, environment,
          purchase_date, last_verified_at, updated_at
        ) VALUES (
          ${userId}, ${platform}, ${subscriptionInfo.originalTransactionId},
          ${subscriptionInfo.latestTransactionId}, ${subscriptionInfo.productId},
          ${subscriptionInfo.status}, ${subscriptionInfo.expiresAt},
          ${subscriptionInfo.autoRenewStatus}, ${subscriptionInfo.environment},
          ${subscriptionInfo.purchaseDate}, NOW(), NOW()
        )
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET
          latest_transaction_id = ${subscriptionInfo.latestTransactionId},
          product_id = ${subscriptionInfo.productId},
          status = ${subscriptionInfo.status},
          expires_at = ${subscriptionInfo.expiresAt},
          auto_renew_status = ${subscriptionInfo.autoRenewStatus},
          environment = ${subscriptionInfo.environment},
          last_verified_at = NOW(),
          updated_at = NOW()
      `;

      await txn`
        INSERT INTO iap_events (
          user_id, event_type, platform, product_id,
          transaction_id, original_transaction_id,
          raw_payload, status, processed_at
        ) VALUES (
          ${userId}, 'receipt_verified', ${platform}, ${subscriptionInfo.productId},
          ${subscriptionInfo.latestTransactionId}, 
          ${subscriptionInfo.originalTransactionId},
          ${JSON.stringify(subscriptionInfo)}, 'processed', NOW()
        )
      `;
    });

    console.log(`[IAP] Successfully updated subscription for user ${userId}`);

    return Response.json({
      success: true,
      isPremium: subscriptionInfo.isPremium,
      status: subscriptionInfo.status,
      productId: subscriptionInfo.productId,
      expiresAt: subscriptionInfo.expiresAt,
      autoRenewStatus: subscriptionInfo.autoRenewStatus,
      environment: subscriptionInfo.environment,
      isTrialPeriod: subscriptionInfo.isTrialPeriod,
    });
  } catch (error) {
    console.error("[IAP] Receipt submission error:", error);
    return Response.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
