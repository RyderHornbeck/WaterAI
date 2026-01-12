import { useEffect } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useImageUpload(
  waterAmount,
  previewImage,
  uploadPromiseRef,
  setUploadedUrl,
) {
  useEffect(() => {
    if (waterAmount && previewImage?.uri && !uploadPromiseRef.current) {
      console.log("Starting background image upload...");

      const uploadImage = async () => {
        try {
          // Resize and compress image
          const manipResult = await ImageManipulator.manipulateAsync(
            previewImage.uri,
            [{ resize: { width: 600 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
          );

          // Convert to base64
          const response = await fetch(manipResult.uri);
          const blob = await response.blob();

          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result.split(",")[1];
              resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Upload with retry logic (up to 2 retries)
          // SECURITY: Use fetchWithAuth instead of plain fetch
          let uploadSuccess = false;
          const maxRetries = 2;
          let lastError = "";
          let url = null;

          for (
            let attempt = 1;
            attempt <= maxRetries && !uploadSuccess;
            attempt++
          ) {
            try {
              console.log(
                `Background upload attempt ${attempt}/${maxRetries}...`,
              );

              const uploadResponse = await fetchWithAuth("/api/upload-bottle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  base64: base64,
                  mimeType: "image/jpeg",
                }),
              });

              const uploadData = await uploadResponse.json();

              if (!uploadResponse.ok || uploadData.error) {
                throw new Error(uploadData.error || "Upload failed");
              }

              url = uploadData.url;
              uploadSuccess = true;
              console.log("Background upload successful:", url);
            } catch (attemptError) {
              console.error(
                `Background upload attempt ${attempt} failed:`,
                attemptError.message,
              );
              lastError = attemptError.message;

              if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            }
          }

          if (!uploadSuccess) {
            throw new Error(lastError || "Upload failed after retries");
          }

          return url;
        } catch (error) {
          console.error("Background upload failed:", error);
          return null;
        }
      };

      uploadPromiseRef.current = uploadImage();

      // Store the result when it completes
      uploadPromiseRef.current.then((url) => {
        setUploadedUrl(url);
        console.log("Background upload completed, URL:", url);
      });
    }
  }, [waterAmount, previewImage, uploadPromiseRef, setUploadedUrl]);
}
