/**
 * Apple Receipt Verification and App Store Server API utilities
 * Handles iOS subscription receipt validation and transaction verification
 */

const APPLE_VERIFY_URL_PRODUCTION =
  "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_VERIFY_URL_SANDBOX =
  "https://sandbox.itunes.apple.com/verifyReceipt";

/**
 * Verify iOS receipt with Apple's servers
 * Uses the legacy verifyReceipt endpoint (still supported)
 *
 * @param {string} receiptData - Base64 encoded receipt
 * @param {boolean} useSandbox - Whether to use sandbox environment
 * @returns {Promise<object>} Verification result
 */
export async function verifyAppleReceipt(receiptData, useSandbox = false) {
  const url = useSandbox
    ? APPLE_VERIFY_URL_SANDBOX
    : APPLE_VERIFY_URL_PRODUCTION;

  // Apple shared secret for subscription verification
  // This must be set in environment variables - get it from App Store Connect
  const sharedSecret = process.env.APPLE_SHARED_SECRET;

  if (!sharedSecret) {
    throw new Error("APPLE_SHARED_SECRET not configured");
  }

  const requestBody = {
    "receipt-data": receiptData,
    password: sharedSecret,
    "exclude-old-transactions": true, // Only get latest transactions
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Apple verification failed: ${response.status}`);
    }

    const result = await response.json();

    // Status codes: https://developer.apple.com/documentation/appstorereceipts/status
    if (result.status === 21007) {
      // Receipt is sandbox, retry with sandbox URL
      if (!useSandbox) {
        console.log("Receipt is from sandbox, retrying with sandbox URL");
        return verifyAppleReceipt(receiptData, true);
      }
    }

    if (result.status !== 0) {
      throw new Error(
        `Apple verification failed with status: ${result.status}`,
      );
    }

    return {
      success: true,
      environment: result.environment,
      receipt: result.receipt,
      latestReceiptInfo: result.latest_receipt_info,
      pendingRenewalInfo: result.pending_renewal_info,
      rawResponse: result,
    };
  } catch (error) {
    console.error("Apple receipt verification error:", error);
    throw error;
  }
}

/**
 * Extract subscription info from Apple's verification response
 * Determines current entitlement state
 *
 * @param {object} verificationResult - Result from verifyAppleReceipt
 * @returns {object} Subscription details
 */
export function extractSubscriptionInfo(verificationResult) {
  const latestReceipts = verificationResult.latestReceiptInfo || [];
  const pendingRenewal = verificationResult.pendingRenewalInfo || [];

  if (!latestReceipts.length) {
    return {
      isPremium: false,
      reason: "No transactions found",
    };
  }

  // Sort by purchase date descending to get most recent
  const sortedReceipts = latestReceipts.sort((a, b) => {
    return parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms);
  });

  const latestTransaction = sortedReceipts[0];
  const expiresMs = parseInt(latestTransaction.expires_date_ms);
  const now = Date.now();

  // Check if subscription is currently active
  const isPremium = expiresMs > now;

  // Get auto-renewal status
  const renewalInfo = pendingRenewal.find(
    (r) =>
      r.original_transaction_id === latestTransaction.original_transaction_id,
  );

  const autoRenewStatus = renewalInfo?.auto_renew_status === "1";

  // Determine status
  let status = "expired";
  if (isPremium) {
    status = "active";
  } else if (autoRenewStatus && renewalInfo?.expiration_intent) {
    // In billing retry
    status = "in_billing_retry";
  } else if (renewalInfo?.is_in_billing_retry_period === "1") {
    status = "in_billing_retry";
  }

  return {
    isPremium,
    status,
    productId: latestTransaction.product_id,
    originalTransactionId: latestTransaction.original_transaction_id,
    latestTransactionId: latestTransaction.transaction_id,
    expiresAt: new Date(expiresMs),
    purchaseDate: new Date(parseInt(latestTransaction.purchase_date_ms)),
    autoRenewStatus,
    environment: verificationResult.environment,
    cancellationDate: latestTransaction.cancellation_date_ms
      ? new Date(parseInt(latestTransaction.cancellation_date_ms))
      : null,
    isTrialPeriod: latestTransaction.is_trial_period === "true",
    isInIntroOfferPeriod: latestTransaction.is_in_intro_offer_period === "true",
  };
}

/**
 * Validate Apple App Store Server Notification signature
 * Required for webhook security
 *
 * @param {string} signedPayload - JWT signed by Apple
 * @returns {object} Decoded and verified payload
 */
export async function verifyAppleNotificationSignature(signedPayload) {
  // This requires the jose library for JWT verification
  // The public keys are available from Apple at:
  // https://appleid.apple.com/auth/keys

  // For production, you should:
  // 1. Fetch Apple's public keys
  // 2. Verify the JWT signature using those keys
  // 3. Validate claims (iss, aud, exp)

  // For now, we'll decode without verification (NOT RECOMMENDED FOR PRODUCTION)
  const [header, payload, signature] = signedPayload.split(".");

  if (!header || !payload || !signature) {
    throw new Error("Invalid signed payload format");
  }

  const decodedPayload = JSON.parse(
    Buffer.from(payload, "base64").toString("utf-8"),
  );

  // TODO: Implement proper signature verification
  // See: https://developer.apple.com/documentation/appstoreservernotifications/jwstransaction

  return decodedPayload;
}

/**
 * Parse App Store Server Notification V2
 *
 * @param {object} notification - Notification body from Apple
 * @returns {object} Parsed event data
 */
export function parseAppleNotification(notification) {
  const { notificationType, subtype, data } = notification;

  // data.signedTransactionInfo contains the actual transaction
  // You should verify this JWT signature in production

  return {
    type: notificationType,
    subtype,
    environment: notification.environment,
    signedTransactionInfo: data?.signedTransactionInfo,
    signedRenewalInfo: data?.signedRenewalInfo,
    raw: notification,
  };
}
