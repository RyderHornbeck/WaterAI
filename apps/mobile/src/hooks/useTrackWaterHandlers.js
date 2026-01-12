import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import useCooldownStore from "@/stores/useCooldownStore";
import { smartRoundInput, convertInputToOz } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function useTrackWaterHandlers({
  pickImage,
  takePhoto,
  resetAnalysis,
  analyzeText,
  analyzeImage,
  handleAnalysisManualEntry,
  addWater,
  setSelectedImage,
  textDescription,
  setTextDescription,
  manualOunces,
  setManualOunces,
  setShowManualEntry,
  setShowTextInput,
  selectedPercentage,
  selectedDuration,
  servingsCount,
  liquidType,
  previewImage,
  setShowImagePreview,
  setSelectedPercentage,
  setSelectedDuration,
  setPreviewImage,
  waterAmount,
  classification,
  analysisLiquidType,
  analysisImageUrl,
  setIsAdding,
  isAdding,
  fetchTodayTotal,
  selectedFavorite,
  setSelectedFavorite,
}) {
  // Use ref for immediate synchronous locking to prevent double-clicks
  const isAddingRef = useRef(false);
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  // Get cooldown functions
  const { canAdd, getRemainingCooldown, recordAdd } = useCooldownStore();

  // Helper to check cooldown before any add operation
  const checkCooldown = useCallback(() => {
    if (!canAdd()) {
      const remainingSeconds = getRemainingCooldown();
      Alert.alert(
        "Please Wait",
        `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""} before adding water again.`,
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
  }, [canAdd, getRemainingCooldown]);

  const handleCameraAction = useCallback(
    (action) => {
      if (action === "gallery") {
        pickImage();
      } else {
        takePhoto();
      }
      resetAnalysis();
    },
    [pickImage, takePhoto, resetAnalysis],
  );

  const handleAnalyzeText = useCallback(() => {
    if (!checkCooldown()) return;

    if (!textDescription.trim()) {
      return;
    }

    setShowTextInput(false);
    analyzeText(textDescription);
  }, [textDescription, analyzeText, setShowTextInput, checkCooldown]);

  const handleManualAdd = useCallback(async () => {
    if (!checkCooldown()) return;

    // Capture favorite data early
    const favoriteData = selectedFavorite;

    // ✅ FIX: If using a favorite, use its stored ounces directly (don't convert from text)
    let ounces;

    if (favoriteData) {
      // Use the favorite's actual stored ounces value (already in oz)
      ounces = parseFloat(favoriteData.ounces);

      // Validate the favorite's ounces value
      if (isNaN(ounces) || ounces <= 0) {
        Alert.alert(
          "Invalid Favorite",
          "This favorite has an invalid amount. Please try another one.",
        );
        return;
      }
    } else {
      // Manual entry: convert user input from their preferred unit to ounces
      const inputValue = parseFloat(manualOunces);
      if (isNaN(inputValue) || inputValue <= 0) {
        Alert.alert(
          "Invalid Amount",
          `Please enter a valid number of ${waterUnit === "liters" ? "liters" : "ounces"}`,
        );
        return;
      }

      // Convert input to ounces (if user is entering liters, convert; otherwise pass through)
      ounces = convertInputToOz(inputValue, waterUnit);

      // Apply smart rounding for manual entries only
      const roundedInput = smartRoundInput(inputValue, waterUnit);
      ounces = convertInputToOz(roundedInput, waterUnit);
    }

    // Check if amount exceeds maximum (500 oz regardless of unit)
    if (ounces > 500) {
      Alert.alert(
        "Amount Too Large",
        `You cannot add more than ${waterUnit === "liters" ? "14.8 L" : "500 oz"} at once. Please enter a smaller amount.`,
      );
      return;
    }

    // ⚡ CLOSE MODAL FIRST so user can see the bottle fill animation
    setManualOunces("");
    setSelectedFavorite(null);
    setShowManualEntry(false);

    try {
      // Now trigger the add (optimistic update happens immediately, bottle fills!)
      if (favoriteData) {
        await addWater(
          ounces, // Use the favorite's actual ounces value
          favoriteData.classification || "manual",
          favoriteData.image_url || null,
          favoriteData.description || null,
          favoriteData.servings || 1,
          favoriteData.liquid_type || "water",
          true, // Mark as created from favorite
        );
      } else {
        await addWater(
          ounces, // Use the converted and rounded ounces from manual entry
          "manual", // classification
          null, // imageUrl
          null, // description
          1, // servings
          "water", // liquidType
          false, // createdFromFavorite
        );
      }

      // Record successful add
      recordAdd();
    } catch (error) {
      console.error("Error adding manual water:", error);
      // Error alert already shown by mutation
      // Don't need to do anything else - optimistic update will rollback automatically
    }
  }, [
    manualOunces,
    selectedFavorite,
    waterUnit,
    addWater,
    setManualOunces,
    setSelectedFavorite,
    setShowManualEntry,
    checkCooldown,
    recordAdd,
  ]);

  const handleContinueWithImage = useCallback(() => {
    if (!checkCooldown()) return;

    if (!selectedPercentage && !selectedDuration) {
      return;
    }

    const context = {
      percentage: selectedPercentage,
      duration: selectedDuration,
      servings: servingsCount,
      liquidType: liquidType.trim() || null,
    };

    setShowImagePreview(false);
    setSelectedImage(null);

    // Analyze immediately without uploading first
    analyzeImage(previewImage, context);
  }, [
    selectedPercentage,
    selectedDuration,
    servingsCount,
    liquidType,
    previewImage,
    analyzeImage,
    setSelectedImage,
    setShowImagePreview,
    checkCooldown,
  ]);

  const handleCancelPreview = useCallback(() => {
    setShowImagePreview(false);
    setPreviewImage(null);
    setSelectedImage(null);
    setSelectedPercentage(null);
    setSelectedDuration(null);
  }, [
    setSelectedImage,
    setShowImagePreview,
    setPreviewImage,
    setSelectedPercentage,
    setSelectedDuration,
  ]);

  const handleManualEntrySubmit = useCallback(async () => {
    if (!checkCooldown()) return;

    // Check ref first (synchronous), then state
    if (isAddingRef.current || isAdding) return;

    // Lock immediately with ref
    isAddingRef.current = true;
    setIsAdding(true);

    // ⚡ CLOSE MODAL FIRST so user can see the bottle fill animation
    resetAnalysis();

    try {
      // Get ounces from manual entry callback and trigger add
      await new Promise((resolve) => {
        handleAnalysisManualEntry(async (ounces) => {
          // Now trigger the add (optimistic update happens immediately, bottle fills!)
          await addWater(
            ounces, // ounces
            "manual", // classification
            null, // imageUrl
            null, // description
            1, // servings
            "water", // liquidType
            false, // createdFromFavorite
          );

          // Record successful add
          recordAdd();

          // Unlock
          isAddingRef.current = false;
          setIsAdding(false);

          resolve();
        });
      });
    } catch (error) {
      console.error("Error in manual entry submit:", error);
      isAddingRef.current = false;
      setIsAdding(false);
      // Error alert already shown by mutation
      // Optimistic update will rollback automatically
    }
  }, [
    handleAnalysisManualEntry,
    addWater,
    isAdding,
    setIsAdding,
    resetAnalysis,
    checkCooldown,
    recordAdd,
  ]);

  const handleConfirmAdd = useCallback(async () => {
    if (!checkCooldown()) return;

    // Check ref first (synchronous), then state and waterAmount
    if (isAddingRef.current || !waterAmount || isAdding) return;

    // Check if amount exceeds maximum
    const numericAmount = parseFloat(waterAmount);
    if (numericAmount > 500) {
      Alert.alert(
        "Amount Too Large",
        "You cannot add more than 500 oz at once. Please try again with a smaller amount.",
      );
      // Cancel the operation
      resetAnalysis();
      setTextDescription("");
      setShowTextInput(false);
      setIsAdding(false);
      setPreviewImage(null);
      return;
    }

    // Lock immediately with ref (synchronous)
    isAddingRef.current = true;
    setIsAdding(true);

    // Store data before clearing
    const description = textDescription.trim() || null;
    const servings = servingsCount;
    const liquid = analysisLiquidType || null;
    const imageUrl = analysisImageUrl || null;

    // ⚡ CLOSE MODAL FIRST so user can see the bottle fill animation
    setPreviewImage(null);
    setTextDescription("");
    setShowTextInput(false);
    resetAnalysis();

    try {
      // Now trigger the add (optimistic update happens immediately, bottle fills!)
      await addWater(
        numericAmount,
        classification,
        imageUrl,
        description,
        servings,
        liquid,
      );

      // Record successful add
      recordAdd();
    } catch (error) {
      console.error("❌ Error adding water:", error);
      // Error alert already shown by mutation
      // Optimistic update will rollback automatically
    } finally {
      // Unlock
      isAddingRef.current = false;
      setIsAdding(false);
    }
  }, [
    waterAmount,
    classification,
    analysisLiquidType,
    analysisImageUrl,
    textDescription,
    servingsCount,
    addWater,
    resetAnalysis,
    isAdding,
    setTextDescription,
    setShowTextInput,
    setIsAdding,
    setPreviewImage,
    checkCooldown,
    recordAdd,
  ]);

  const handleConfirmCancel = useCallback(() => {
    resetAnalysis();
    setTextDescription("");
    setShowTextInput(false);
    isAddingRef.current = false;
    setIsAdding(false);
    setPreviewImage(null);
  }, [
    resetAnalysis,
    setTextDescription,
    setShowTextInput,
    setIsAdding,
    setPreviewImage,
  ]);

  return {
    handleCameraAction,
    handleAnalyzeText,
    handleManualAdd,
    handleContinueWithImage,
    handleCancelPreview,
    handleManualEntrySubmit,
    handleConfirmAdd,
    handleConfirmCancel,
    isAdding,
  };
}
