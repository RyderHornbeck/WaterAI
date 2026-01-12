import { useState, useCallback } from "react";

export function useTrackWaterModals() {
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textDescription, setTextDescription] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualOunces, setManualOunces] = useState("");
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [showTodayEntries, setShowTodayEntries] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [servingsCount, setServingsCount] = useState(1);
  const [liquidType, setLiquidType] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleToggleTextInput = useCallback(() => {
    setShowTextInput(!showTextInput);
    setShowCameraMenu(false);
    setShowManualEntry(false);
    // Reset servings for new drink process
    setServingsCount(1);
    setLiquidType("");
  }, [showTextInput]);

  const handleToggleCameraMenu = useCallback(() => {
    setShowCameraMenu(!showCameraMenu);
    setShowTextInput(false);
    setShowManualEntry(false);
    // Reset servings for new drink process
    setServingsCount(1);
    setLiquidType("");
  }, [showCameraMenu]);

  const handleToggleManualEntry = useCallback(() => {
    setShowManualEntry(!showManualEntry);
    setShowCameraMenu(false);
    setShowTextInput(false);
    // Reset servings for new drink process
    setServingsCount(1);
  }, [showManualEntry]);

  const resetModals = useCallback(() => {
    setShowCameraMenu(false);
    setShowTextInput(false);
    setShowManualEntry(false);
    setShowImagePreview(false);
    setPreviewImage(null);
    setSelectedPercentage(null);
    setSelectedDuration(null);
    setServingsCount(1);
    setLiquidType("");
    setTextDescription("");
    setManualOunces("");
    setSelectedFavorite(null);
    setIsAdding(false);
  }, []);

  return {
    showCameraMenu,
    setShowCameraMenu,
    showTextInput,
    setShowTextInput,
    textDescription,
    setTextDescription,
    showManualEntry,
    setShowManualEntry,
    manualOunces,
    setManualOunces,
    selectedFavorite,
    setSelectedFavorite,
    showTodayEntries,
    setShowTodayEntries,
    showImagePreview,
    setShowImagePreview,
    previewImage,
    setPreviewImage,
    selectedPercentage,
    setSelectedPercentage,
    selectedDuration,
    setSelectedDuration,
    servingsCount,
    setServingsCount,
    liquidType,
    setLiquidType,
    isAdding,
    setIsAdding,
    handleToggleTextInput,
    handleToggleCameraMenu,
    handleToggleManualEntry,
    resetModals,
  };
}
