import crypto from "crypto";

// AWS Signature Version 4 signing
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = crypto
    .createHmac("sha256", "AWS4" + key)
    .update(dateStamp)
    .digest();
  const kRegion = crypto
    .createHmac("sha256", kDate)
    .update(regionName)
    .digest();
  const kService = crypto
    .createHmac("sha256", kRegion)
    .update(serviceName)
    .digest();
  const kSigning = crypto
    .createHmac("sha256", kService)
    .update("aws4_request")
    .digest();
  return kSigning;
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function upload({ buffer, base64, mimeType = "image/jpeg" }) {
  try {
    // Convert base64 to buffer if needed
    const imageBuffer = buffer || Buffer.from(base64, "base64");

    // Generate unique filename
    const fileExtension = mimeType === "image/png" ? "png" : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // R2 configuration
    const bucket = process.env.R2_BUCKET_NAME;
    const region = "auto";
    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const url = `${endpoint}/${bucket}/${filename}`;

    // AWS Signature V4 signing
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const service = "s3";

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    // Canonical request
    const payloadHash = sha256(imageBuffer);
    const canonicalUri = `/${bucket}/${filename}`;
    const canonicalHeaders = `host:${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // String to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    // Calculate signature
    const signingKey = getSignatureKey(
      secretAccessKey,
      dateStamp,
      region,
      service,
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to R2
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        Authorization: authorization,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("R2 upload error:", response.status, errorText);
      throw new Error(
        `R2 upload failed: ${response.status} ${response.statusText}`,
      );
    }

    // Construct public URL using R2's standard public URL format
    // If R2_PUBLIC_URL is set and valid, use it; otherwise use the default R2 URL
    let publicUrl;
    if (
      process.env.R2_PUBLIC_URL &&
      !process.env.R2_PUBLIC_URL.includes("images.water.org")
    ) {
      // Use custom domain if it's properly configured
      publicUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
    } else {
      // Use standard R2 public URL format
      publicUrl = `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filename}`;
    }

    console.log("Generated public URL:", publicUrl);

    return {
      url: publicUrl,
      mimeType: mimeType,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    return {
      error: error.message || "Failed to upload to R2",
    };
  }
}

export { upload };
export default upload;
