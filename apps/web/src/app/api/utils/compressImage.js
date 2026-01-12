/**
 * Compress a base64 image to a specified quality level
 * @param {string} base64 - Base64 encoded image (without data URI prefix)
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @param {number} quality - Quality level (1-100)
 * @returns {Promise<{base64: string, buffer: Buffer}>} Compressed image
 */
export async function compressImage(base64, mimeType, quality = 80) {
  try {
    // Convert base64 to buffer
    const inputBuffer = Buffer.from(base64, "base64");

    // Sharp is optional - if it's not available, we'll just return the original
    // This is intentionally using dynamic import because sharp is an optional dependency
    let sharp;
    try {
      sharp = (await import("sharp")).default;
    } catch {
      // Sharp not available, return original
      console.warn(
        "Sharp not available for image compression, using original image",
      );
      return {
        base64: base64,
        buffer: inputBuffer,
      };
    }

    try {
      // For PNG images, convert to JPEG for better compression
      const isPng = mimeType === "image/png";

      let sharpInstance = sharp(inputBuffer);

      // Convert to JPEG with specified quality
      if (isPng || mimeType === "image/jpeg" || mimeType === "image/jpg") {
        sharpInstance = sharpInstance.jpeg({
          quality: quality,
          progressive: true,
          mozjpeg: true, // Use mozjpeg for better compression
        });
      }

      const compressedBuffer = await sharpInstance.toBuffer();

      console.log(
        `Image compressed from ${inputBuffer.length} to ${compressedBuffer.length} bytes (${Math.round((compressedBuffer.length / inputBuffer.length) * 100)}% of original)`,
      );

      return {
        base64: compressedBuffer.toString("base64"),
        buffer: compressedBuffer,
      };
    } catch (sharpError) {
      // Error using sharp
      console.warn(
        "Error using sharp for image compression, using original image:",
        sharpError.message,
      );

      // Return original image
      return {
        base64: base64,
        buffer: inputBuffer,
      };
    }
  } catch (error) {
    console.error("Error in compressImage:", error);
    // Return original if compression fails
    const buffer = Buffer.from(base64, "base64");
    return {
      base64: base64,
      buffer: buffer,
    };
  }
}
