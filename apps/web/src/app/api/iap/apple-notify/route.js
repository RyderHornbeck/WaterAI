/**
 * POST /api/iap/apple-notify
 *
 * Webhook endpoint for App Store Server Notifications V2
 */

import sql from "@/app/api/utils/sql";
import {
  verifyAppleNotificationSignature,
  parseAppleNotification,
} from "@/app/api/iap/utils/appleVerify";

export async function POST(request) {
  try {
    const notification = await request.json();

    console.log("[IAP Webhook] Received Apple notification:", {
      type: notification.notificationType,
      subtype: notification.subtype,
    });

    const parsed = parseAppleNotification(notification);
    const transactionInfo = decodeJWT(parsed.signedTransactionInfo);
    const renewalInfo = parsed.signedRenewalInfo
      ? decodeJWT(parsed.signedRenewalInfo)
      : null;

    const {
      originalTransactionId,
      transactionId,
      productId,
      purchaseDateMs,
      expiresDateMs,
      environment,
    } = transactionInfo;

    console.log("[IAP Webhook] Transaction info:", {
      originalTransactionId,
      transactionId,
      productId,
      type: notification.notificationType,
    });

    const [subscription] = await sql`
      SELECT user_id
      FROM user_subscriptions
      WHERE original_transaction_id = ${originalTransactionId}
      LIMIT 1
    `;

    const userId = subscription?.user_id;

    await sql`
      INSERT INTO iap_events (
        user_id, event_type, platform, product_id,
        transaction_id, original_transaction_id,
        signed_payload, raw_payload, received_at
      ) VALUES (
        ${userId}, ${notification.notificationType}, 'ios', ${productId},
        ${transactionId}, ${originalTransactionId},
        ${parsed.signedTransactionInfo}, ${JSON.stringify(notification)},
        NOW()
      )
    `;

    await processNotification(
      notification.notificationType,
      notification.subtype,
      {
        userId,
        originalTransactionId,
        transactionId,
        productId,
        expiresDateMs,
        purchaseDateMs,
        environment,
        renewalInfo,
      },
    );

    return Response.json({ received: true });
  } catch (error) {
    console.error("[IAP Webhook] Error processing notification:", error);
    return Response.json({ received: true, error: error.message });
  }
}

async function processNotification(notificationType, subtype, data) {
  const {
    userId,
    originalTransactionId,
    transactionId,
    productId,
    expiresDateMs,
    purchaseDateMs,
    environment,
    renewalInfo,
  } = data;

  const expiresAt = expiresDateMs ? new Date(parseInt(expiresDateMs)) : null;
  const purchaseDate = purchaseDateMs
    ? new Date(parseInt(purchaseDateMs))
    : null;
  const autoRenewStatus = renewalInfo?.autoRenewStatus === 1;

  console.log(`[IAP Webhook] Processing ${notificationType} (${subtype})`);

  switch (notificationType) {
    case "SUBSCRIBED":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            latest_transaction_id = ${transactionId},
            product_id = ${productId},
            status = 'active',
            expires_at = ${expiresAt},
            auto_renew_status = ${autoRenewStatus},
            environment = ${environment},
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    case "DID_RENEW":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            latest_transaction_id = ${transactionId},
            status = 'active',
            expires_at = ${expiresAt},
            auto_renew_status = true,
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    case "DID_FAIL_TO_RENEW":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            status = 'in_billing_retry',
            auto_renew_status = ${autoRenewStatus},
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    case "DID_CHANGE_RENEWAL_STATUS":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            auto_renew_status = ${autoRenewStatus},
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    case "EXPIRED":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            status = 'expired',
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    case "REFUND":
      if (userId) {
        await sql`
          UPDATE user_subscriptions
          SET 
            status = 'refunded',
            auto_renew_status = false,
            last_verified_at = NOW(),
            updated_at = NOW()
          WHERE user_id = ${userId}
          AND original_transaction_id = ${originalTransactionId}
        `;
      }
      break;

    default:
      console.log(
        `[IAP Webhook] Unhandled notification type: ${notificationType}`,
      );
  }

  await sql`
    UPDATE iap_events
    SET status = 'processed', processed_at = NOW()
    WHERE original_transaction_id = ${originalTransactionId}
    AND event_type = ${notificationType}
    AND processed_at IS NULL
  `;
}

function decodeJWT(token) {
  if (!token) return null;

  const [header, payload, signature] = token.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}
