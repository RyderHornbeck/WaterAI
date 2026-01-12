import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

// Direct analysis - no polling, immediate response
async function analyzeDirect(endpoint, payload, setAnalysisStep) {
  const requestId = Date.now();
  console.log(
    `[${requestId}] [analyzeDirect] Starting analysis via ${endpoint}`,
  );

  setAnalysisStep("AI analyzing...");

  console.log(
    `[${requestId}] [analyzeDirect] Sending request to ${endpoint}...`,
  );
  const response = await fetchWithAuth(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await response.json();
    console.log(`[${requestId}] [analyzeDirect] Response received:`, data);
  } catch (jsonError) {
    console.error(
      `[${requestId}] [analyzeDirect] ❌ JSON parse error:`,
      jsonError,
    );
    throw new Error("SERVER_PARSE_ERROR");
  }

  if (!response.ok) {
    console.error(
      `[${requestId}] [analyzeDirect] ❌ Request failed with status ${response.status}`,
    );

    // Check for rate limit error
    if (response.status === 429 && data.limitExceeded) {
      console.log(`[${requestId}] [analyzeDirect] ⛔ Rate limit exceeded`);
      const error = new Error(data.error || "Daily limit reached");
      error.isRateLimit = true;
      throw error;
    }

    const errorMessage = data.details
      ? `${data.error}: ${data.details}`
      : data.error || `Analysis failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  // Direct response - return the entry data
  if (data.success && data.entry) {
    console.log(
      `[${requestId}] [analyzeDirect] ✅ Analysis complete!`,
      data.entry,
    );
    setAnalysisStep("Complete!");
    return data.entry;
  }

  // Fallback for unexpected response format
  console.error(
    `[${requestId}] [analyzeDirect] ❌ Unexpected response format:`,
    data,
  );
  throw new Error("Unexpected response format from server");
}

export function useWaterAnalysis() {
  const [waterAmount, setWaterAmount] = useState(null);
  const [classification, setClassification] = useState(null);
  const [liquidType, setLiquidType] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualOunces, setManualOunces] = useState("");
  const [analysisImageUrl, setAnalysisImageUrl] = useState(null);

  const analyzeImage = useCallback(async (selectedImage, context = {}) => {
    if (!selectedImage?.base64) {
      Alert.alert("Error", "No image data available");
      return;
    }

    setAnalyzing(true);
    setAnalysisStep("AI analyzing your glass...");
    setShowManualEntry(false);
    setManualOunces("");
    setAnalysisImageUrl(null);

    try {
      const result = await analyzeDirect(
        "/api/analyze-water",
        {
          base64: selectedImage.base64,
          mimeType: selectedImage.mimeType || "image/jpeg",
          percentage: context.percentage,
          duration: context.duration,
          servings: context.servings,
          liquidType: context.liquidType,
        },
        setAnalysisStep,
      );

      const numericOunces = parseFloat(result.ounces);
      setWaterAmount(numericOunces);
      setClassification(result.classification || "reusable-bottle");
      setLiquidType(result.liquidType || null);
      setAnalysisImageUrl(result.imageUrl || null);
      console.log("📸 Captured imageUrl from analysis:", result.imageUrl);
      setAnalyzing(false);
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysisStep("");
      setAnalyzing(false);

      // Check for rate limit error first
      if (err.isRateLimit) {
        Alert.alert("Daily Limit Reached", err.message);
        return;
      }

      // Detect network errors specifically
      const isNetworkError =
        err.message?.includes("Network request failed") ||
        err.message?.includes("fetch failed") ||
        err.message?.includes("Failed to fetch") ||
        err.name === "TypeError" ||
        err.code === "ENOTFOUND" ||
        err.code === "ECONNREFUSED";

      if (isNetworkError) {
        // Network error - show clear message, NO manual entry modal
        Alert.alert(
          "No Connection",
          "Please check your wifi or cellular connection and try again.",
          [{ text: "OK", style: "cancel" }],
        );
      } else {
        // Other errors - show manual entry as fallback for IMAGE analysis
        setShowManualEntry(true);

        if (err.message === "SERVER_PARSE_ERROR") {
          Alert.alert(
            "Oops, something went wrong",
            "We couldn't process that. Please try again.",
            [
              { text: "OK", style: "cancel" },
              {
                text: "Try Again",
                onPress: () => analyzeImage(selectedImage, context),
              },
            ],
          );
        } else {
          Alert.alert(
            "Oops, something went wrong",
            err.message || "Please try again.",
            [
              { text: "OK", style: "cancel" },
              {
                text: "Try Again",
                onPress: () => analyzeImage(selectedImage, context),
              },
            ],
          );
        }
      }
    }
  }, []);

  const analyzeBarcode = useCallback(async (selectedImage, context = {}) => {
    if (!selectedImage?.base64) {
      Alert.alert("Error", "No image data available");
      return;
    }

    setAnalyzing(true);
    setAnalysisStep("AI analyzing barcode...");
    setShowManualEntry(false);
    setManualOunces("");

    try {
      const result = await analyzeDirect(
        "/api/analyze-barcode",
        {
          base64: selectedImage.base64,
          mimeType: selectedImage.mimeType || "image/jpeg",
          percentage: context.percentage,
          duration: context.duration,
          servings: context.servings,
          liquidType: context.liquidType,
        },
        setAnalysisStep,
      );

      const numericOunces = parseFloat(result.ounces);
      setWaterAmount(numericOunces);
      setClassification(result.classification || "disposable-bottle");
      setLiquidType(result.liquidType || null);
      setAnalysisImageUrl(result.imageUrl || null);
      console.log(
        "📸 Captured imageUrl from barcode analysis:",
        result.imageUrl,
      );
      setAnalyzing(false);
    } catch (err) {
      console.error("Barcode analysis error:", err);
      setAnalysisStep("");
      setAnalyzing(false);

      // Check for rate limit error first
      if (err.isRateLimit) {
        Alert.alert("Daily Limit Reached", err.message);
        return;
      }

      // Detect network errors specifically
      const isNetworkError =
        err.message?.includes("Network request failed") ||
        err.message?.includes("fetch failed") ||
        err.message?.includes("Failed to fetch") ||
        err.name === "TypeError" ||
        err.code === "ENOTFOUND" ||
        err.code === "ECONNREFUSED";

      if (isNetworkError) {
        // Network error - show clear message, NO manual entry modal
        Alert.alert(
          "No Connection",
          "Please check your wifi or cellular connection and try again.",
          [{ text: "OK", style: "cancel" }],
        );
      } else {
        // Other errors - show manual entry as fallback for BARCODE analysis
        setShowManualEntry(true);

        if (err.message === "SERVER_PARSE_ERROR") {
          Alert.alert(
            "Oops, something went wrong",
            "We couldn't process that. Please try again.",
            [
              { text: "OK", style: "cancel" },
              {
                text: "Try Again",
                onPress: () => analyzeBarcode(selectedImage, context),
              },
            ],
          );
        } else {
          Alert.alert(
            "Oops, something went wrong",
            err.message || "Please try again.",
            [
              { text: "OK", style: "cancel" },
              {
                text: "Try Again",
                onPress: () => analyzeBarcode(selectedImage, context),
              },
            ],
          );
        }
      }
    }
  }, []);

  const analyzeText = useCallback(async (textDescription) => {
    if (!textDescription.trim()) {
      Alert.alert("Missing Description", "Please describe what you drank");
      return;
    }

    setAnalyzing(true);
    setAnalysisStep("AI analyzing your description...");
    // DO NOT set showManualEntry for text analysis
    setShowManualEntry(false);

    try {
      const result = await analyzeDirect(
        "/api/analyze-text",
        {
          description: textDescription,
        },
        setAnalysisStep,
      );

      const numericOunces = parseFloat(result.ounces);
      setWaterAmount(numericOunces);
      setClassification("description");
      setLiquidType(result.liquidType || null);
      setAnalyzing(false);
    } catch (err) {
      console.error("Text analysis error:", err);
      setAnalysisStep("");
      setAnalyzing(false);
      // DO NOT show manual entry for text analysis failures

      // Check for rate limit error first
      if (err.isRateLimit) {
        Alert.alert("Daily Limit Reached", err.message);
        return;
      }

      // Detect network errors specifically
      const isNetworkError =
        err.message?.includes("Network request failed") ||
        err.message?.includes("fetch failed") ||
        err.message?.includes("Failed to fetch") ||
        err.name === "TypeError" ||
        err.code === "ENOTFOUND" ||
        err.code === "ECONNREFUSED";

      if (isNetworkError) {
        // Network error - show clear message and close
        Alert.alert(
          "No Connection",
          "Please check your wifi or cellular connection and try again.",
          [{ text: "OK", style: "cancel" }],
        );
      } else if (err.message === "SERVER_PARSE_ERROR") {
        // Server error - just show alert, don't offer manual entry
        Alert.alert(
          "Oops, something went wrong",
          "We couldn't process that description. Please try again with a different description.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Try Again",
              onPress: () => analyzeText(textDescription),
            },
          ],
        );
      } else {
        // Other errors - just show alert, don't offer manual entry
        Alert.alert(
          "Oops, something went wrong",
          err.message || "Please try describing your drink differently.",
          [
            { text: "OK", style: "cancel" },
            {
              text: "Try Again",
              onPress: () => analyzeText(textDescription),
            },
          ],
        );
      }
    }
  }, []);

  const handleManualEntry = useCallback(
    async (onSuccess) => {
      const ounces = parseFloat(manualOunces);
      if (isNaN(ounces) || ounces <= 0) {
        Alert.alert("Invalid Amount", "Please enter a valid number of ounces");
        return;
      }

      setWaterAmount(ounces);
      if (onSuccess) {
        onSuccess(ounces);
      }
      setShowManualEntry(false);
      setManualOunces("");
      setAnalysisStep("");
    },
    [manualOunces],
  );

  const cancelAnalysis = useCallback(() => {
    setAnalyzing(false);
    setAnalysisStep("");
    setShowManualEntry(false);
  }, []);

  const resetAnalysis = useCallback(() => {
    setWaterAmount(null);
    setClassification(null);
    setLiquidType(null);
    setAnalysisImageUrl(null);
    setAnalyzing(false);
    setAnalysisStep("");
    setShowManualEntry(false);
    setManualOunces("");
  }, []);

  return {
    waterAmount,
    classification,
    liquidType,
    analysisImageUrl,
    analyzing,
    analysisStep,
    showManualEntry,
    manualOunces,
    setManualOunces,
    analyzeImage,
    analyzeBarcode,
    analyzeText,
    handleManualEntry,
    cancelAnalysis,
    resetAnalysis,
  };
}
