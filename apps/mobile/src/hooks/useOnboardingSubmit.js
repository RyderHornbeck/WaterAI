import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/utils/auth/useAuth";
import { litersToOz } from "@/utils/unitHelpers";

export function useOnboardingSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { signUp, isAuthenticated } = useAuth();

  const uploadBottleImage = async (bottle) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      bottle.uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );

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

    let uploadSuccess = false;
    let uploadUrl = null;
    const maxRetries = 2;
    let lastError = "";

    for (let attempt = 1; attempt <= maxRetries && !uploadSuccess; attempt++) {
      try {
        console.log(
          `Uploading bottle ${bottle.id} via backend, attempt ${attempt}/${maxRetries}`,
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

        uploadUrl = uploadData.url;
        uploadSuccess = true;
        console.log(`Bottle ${bottle.id} uploaded successfully`);
      } catch (attemptError) {
        console.error(
          `Upload attempt ${attempt} failed:`,
          attemptError.message,
        );
        lastError = attemptError.message;

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!uploadSuccess || !uploadUrl) {
      throw new Error(lastError || "Upload failed");
    }

    return uploadUrl;
  };

  const completeOnboarding = async (answers, bottles) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Step 1: Check if user is authenticated, if not, show sign up
      if (!isAuthenticated) {
        console.log("User not authenticated, showing sign up modal");

        // Show sign up modal
        signUp();

        // Reset submitting state so they can try again after signing up
        setIsSubmitting(false);
        return;
      }

      // Get the daily goal from goalCalculation answer
      let dailyGoal = answers.goalCalculation?.goal
        ? parseFloat(answers.goalCalculation.goal)
        : 64; // Default fallback

      console.log("🔍 ONBOARDING DEBUG - Initial values:", {
        rawGoalValue: answers.goalCalculation?.goal,
        parsedGoal: dailyGoal,
        goalUnit: answers.goalCalculation?.unit,
        userWaterUnit: answers.waterUnit,
        willConvert:
          answers.waterUnit === "liters" &&
          answers.goalCalculation?.unit === "L",
      });

      // Convert to ounces if the user selected liters
      if (
        answers.waterUnit === "liters" &&
        answers.goalCalculation?.unit === "L"
      ) {
        const beforeConversion = dailyGoal;
        dailyGoal = litersToOz(dailyGoal);
        console.log(
          `✅ Converting ${beforeConversion}L to ${dailyGoal}oz using litersToOz()`,
        );
      } else {
        console.log("⚠️ NOT converting - condition not met:", {
          waterUnitCheck: answers.waterUnit === "liters",
          actualWaterUnit: answers.waterUnit,
          goalUnitCheck: answers.goalCalculation?.unit === "L",
          actualGoalUnit: answers.goalCalculation?.unit,
        });
      }

      // Round to 2 decimal places to preserve precision (e.g., 64.24 oz for 1.9L)
      dailyGoal = parseFloat(dailyGoal.toFixed(2));

      console.log("💾 Final daily goal to save:", dailyGoal, "oz");

      // Auto-detect timezone from device (no permissions needed)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("Auto-detected timezone:", timezone);

      // Save user settings with retry logic for newly created accounts
      let settingsSaved = false;
      let lastError = null;
      let errorType = null;
      const maxRetries = 3;

      for (
        let attempt = 1;
        attempt <= maxRetries && !settingsSaved;
        attempt++
      ) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} to save user settings`);

          const response = await fetchWithAuth("/api/user-goal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gender: answers.gender,
              age: answers.age,
              heightWeight: answers.heightWeight,
              workoutsPerWeek: answers.workoutsPerWeek
                ? parseInt(answers.workoutsPerWeek, 10)
                : null,
              waterGoal: answers.waterGoal,
              waterUnit: answers.waterUnit,
              handSize: answers.handSize,
              sipSize: answers.sipSize,
              dailyGoal: dailyGoal,
              timezone,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check for specific error types
            if (response.status === 401) {
              errorType = "auth";
              throw new Error(
                "Your session has expired. Please sign in again.",
              );
            } else if (response.status >= 500) {
              errorType = "server";
              throw new Error(
                errorData.error || "The server is having trouble right now.",
              );
            } else if (
              errorData.error &&
              errorData.error.includes("database")
            ) {
              errorType = "database";
              throw new Error("Database error: " + errorData.error);
            } else {
              errorType = "generic";
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }
          }

          settingsSaved = true;
          console.log("User settings saved successfully");
        } catch (saveError) {
          console.error(`Settings save attempt ${attempt} failed:`, saveError);
          lastError = saveError.message;

          // Check for network errors
          if (
            saveError.name === "TypeError" ||
            saveError.message === "Network request failed"
          ) {
            errorType = "network";
            lastError =
              "No internet connection. Please check your WiFi or cellular data.";
          }

          // Don't retry auth errors
          if (errorType === "auth") {
            break;
          }

          // Wait before retrying (faster delays: 500ms, 750ms, 1s)
          if (attempt < maxRetries && errorType !== "auth") {
            const delay = 250 + attempt * 250; // 500ms, 750ms, 1000ms
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!settingsSaved) {
        // Show specific error message based on error type
        let errorTitle = "Settings Save Error";
        let errorMessage = `Couldn't save your preferences after ${maxRetries} attempts.`;

        if (errorType === "network") {
          errorTitle = "No Internet Connection";
          errorMessage =
            lastError +
            "\n\nYour account was created, but please update your settings later.";
        } else if (errorType === "auth") {
          errorTitle = "Session Expired";
          errorMessage =
            lastError + "\n\nPlease sign in again to complete setup.";
          Alert.alert(errorTitle, errorMessage, [
            { text: "OK", onPress: () => setIsSubmitting(false) },
          ]);
          return;
        } else if (errorType === "server") {
          errorTitle = "Server Error";
          errorMessage =
            lastError +
            "\n\nYour account was created, but please update your settings later.";
        } else if (errorType === "database") {
          errorTitle = "Database Error";
          errorMessage =
            "There was a problem saving to the database.\n\nYour account was created, but please update your settings later.";
        } else {
          errorMessage += `\n\nError: ${lastError}\n\nYour account was created, but please update your settings later.`;
        }

        Alert.alert(errorTitle, errorMessage, [
          { text: "Continue", onPress: () => router.replace("/(tabs)") },
        ]);
        setIsSubmitting(false);
        return;
      }

      if (bottles.length > 0) {
        const validBottles = bottles.filter(
          (b) => b.uri && b.ounces && parseFloat(b.ounces) > 0,
        );

        if (validBottles.length > 0) {
          const uploadedBottles = [];
          let failedCount = 0;
          let lastUploadError = "";
          let uploadErrorType = null;

          for (const bottle of validBottles) {
            try {
              const uploadUrl = await uploadBottleImage(bottle);
              uploadedBottles.push({
                imageUrl: uploadUrl,
                ounces: parseFloat(bottle.ounces),
              });
            } catch (uploadError) {
              console.error("Upload error for bottle:", uploadError);
              lastUploadError = uploadError.message || "Unknown error";

              // Detect error type
              if (
                uploadError.name === "TypeError" ||
                uploadError.message === "Network request failed"
              ) {
                uploadErrorType = "network";
                lastUploadError =
                  "No internet connection. Please check your WiFi or cellular data.";
              } else if (uploadError.message.includes("timeout")) {
                uploadErrorType = "timeout";
                lastUploadError =
                  "Upload took too long. Your connection may be slow.";
              } else if (uploadError.message.includes("401")) {
                uploadErrorType = "auth";
                lastUploadError = "Your session expired. Please sign in again.";
              } else if (uploadError.message.includes("500")) {
                uploadErrorType = "server";
                lastUploadError = "Server error. Please try again later.";
              }

              failedCount++;
            }
          }

          if (uploadedBottles.length > 0) {
            try {
              const saveResponse = await fetchWithAuth("/api/user-bottles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bottles: uploadedBottles,
                }),
              });

              if (!saveResponse.ok) {
                const errorData = await saveResponse.json();

                let saveErrorMessage =
                  "Bottles were uploaded but couldn't be saved to your account.";
                if (saveResponse.status === 401) {
                  saveErrorMessage =
                    "Your session expired. Please add your bottles again from settings.";
                } else if (saveResponse.status >= 500) {
                  saveErrorMessage =
                    "Server error. Your bottles were uploaded but couldn't be saved.";
                } else if (
                  errorData.error &&
                  errorData.error.includes("database")
                ) {
                  saveErrorMessage =
                    "Database error. Your bottles were uploaded but couldn't be saved.";
                }

                throw new Error(saveErrorMessage);
              }

              const savedCount = uploadedBottles.length;
              const totalCount = validBottles.length;

              if (failedCount > 0) {
                let failTitle = "Partially Saved";
                let failMessage = `${savedCount} of ${totalCount} bottle${totalCount > 1 ? "s" : ""} saved successfully. ${failedCount} failed to upload.`;

                if (uploadErrorType === "network") {
                  failTitle = "Upload Failed - No Connection";
                  failMessage += `\n\n${lastUploadError}`;
                } else if (uploadErrorType === "timeout") {
                  failTitle = "Upload Failed - Slow Connection";
                  failMessage += `\n\n${lastUploadError}`;
                } else if (uploadErrorType === "auth") {
                  failTitle = "Upload Failed - Session Expired";
                  failMessage += `\n\n${lastUploadError}`;
                } else if (uploadErrorType === "server") {
                  failTitle = "Upload Failed - Server Error";
                  failMessage += `\n\n${lastUploadError}`;
                } else {
                  failMessage += `\n\nError: ${lastUploadError}`;
                }

                Alert.alert(failTitle, failMessage, [{ text: "OK" }]);
              } else {
                Alert.alert(
                  "Success!",
                  `All ${savedCount} bottle${savedCount > 1 ? "s" : ""} saved successfully.`,
                  [{ text: "Great!" }],
                );
              }
            } catch (saveError) {
              console.error("Error saving bottles to database:", saveError);
              Alert.alert(
                "Save Error",
                saveError.message || "Please try again.",
                [{ text: "OK" }],
              );
              setIsSubmitting(false);
              return;
            }
          } else if (failedCount > 0) {
            let failTitle = "Upload Failed";
            let failMessage = `Failed to upload ${failedCount} bottle${failedCount > 1 ? "s" : ""}.`;

            if (uploadErrorType === "network") {
              failTitle = "No Internet Connection";
              failMessage = lastUploadError;
            } else if (uploadErrorType === "timeout") {
              failTitle = "Connection Too Slow";
              failMessage = lastUploadError;
            } else if (uploadErrorType === "auth") {
              failTitle = "Session Expired";
              failMessage = lastUploadError;
            } else if (uploadErrorType === "server") {
              failTitle = "Server Error";
              failMessage = lastUploadError;
            } else {
              failMessage += `\n\nError: ${lastUploadError}`;
            }

            failMessage += "\n\nPlease check your connection and try again.";

            Alert.alert(failTitle, failMessage, [
              {
                text: "Skip Bottles",
                onPress: () => router.replace("/(tabs)"),
              },
              { text: "Try Again", onPress: () => setIsSubmitting(false) },
            ]);
            setIsSubmitting(false);
            return;
          }
        }
      }

      router.replace("/(tabs)");
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setIsSubmitting(false);

      // Generic catch-all error
      let errorTitle = "Error";
      let errorMessage =
        "There was a problem completing setup. Please try again.";

      if (
        err.name === "TypeError" ||
        err.message === "Network request failed"
      ) {
        errorTitle = "No Internet Connection";
        errorMessage = "Please check your WiFi or cellular data and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert(errorTitle, errorMessage);
    }
  };

  return {
    isSubmitting,
    completeOnboarding,
  };
}
