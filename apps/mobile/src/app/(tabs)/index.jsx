// Water tracking main screen
import { useState, useEffect, useRef } from "react";
import {
  View,
  Animated,
  Modal,
  ScrollView,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTodayWater, useAddWater } from "@/hooks/useWaterEntries";
import { useImagePicker } from "@/hooks/useImagePicker";
import { useWaterAnalysis } from "@/hooks/useWaterAnalysis";
import { useBottleAnimation } from "@/hooks/useBottleAnimation";
import { useTrackWaterModals } from "@/hooks/useTrackWaterModals";
import { useTrackWaterHandlers } from "@/hooks/useTrackWaterHandlers";
import { useWeeklyGoal } from "@/hooks/useWeeklyGoal";
import useUserSettingsStore from "@/stores/useUserSettingsStore";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getCurrentDateObject, getWeekStart } from "@/utils/dateHelpers";
import { Header } from "@/components/Header/Header";
import { ActionButtons } from "@/components/ActionButtons/ActionButtons";
import { CustomCamera } from "@/components/CustomCamera/CustomCamera";
import { TodayEntriesSheet } from "@/components/TodayEntriesSheet/TodayEntriesSheet";
import { LoadingScreen } from "@/components/TrackWater/LoadingScreen";
import { SwipeableViews } from "@/components/TrackWater/SwipeableViews";
import { ImagePreviewModal } from "@/components/TrackWater/ImagePreviewModal";
import { AnalysisModal } from "@/components/TrackWater/AnalysisModal";
import React from "react";

export default function TrackWater() {
  const insets = useSafeAreaInsets();

  // Network status
  const { hasNetwork } = useNetworkStatus();
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);

  const {
    dailyGoal: fallbackGoal,
    isLoading: settingsLoading,
    isInitialized: settingsInitialized,
    getCurrentDate,
    timeOffsetDays,
    waterUnit, // Get waterUnit from settings store
  } = useUserSettingsStore();

  // ✅ Use the same week calculation as history page
  const currentWeekStart = getWeekStart(getCurrentDate());

  // ✅ Fetch goal for current week
  const {
    data: weeklyGoalData,
    isLoading: goalLoading,
    refetch: refetchGoal,
  } = useWeeklyGoal(
    currentWeekStart,
    settingsInitialized, // Only fetch when settings are ready
  );

  // Use current week's goal, fallback to settings default
  const dailyGoal = weeklyGoalData?.weeklyGoal || fallbackGoal;

  // Use time-travel adjusted date for display (can be offset for testing)
  const currentDate = getCurrentDateObject();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;

  // Use React Query for water data
  const {
    total: todayTotal,
    entries,
    isLoading: waterLoading,
    refetch: fetchTodayTotal,
  } = useTodayWater(dateString);

  // Use React Query mutation for adding water
  const addWaterMutation = useAddWater(dateString);

  // Auto-hide offline warning after 5 seconds
  useEffect(() => {
    if (showOfflineWarning) {
      const timer = setTimeout(() => {
        setShowOfflineWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineWarning]);

  // Wrap mutation in a function with the same signature as before
  const addWater = async (
    ounces,
    classification,
    imageUrl = null,
    description = null,
    servings = 1,
    liquidType = null,
    createdFromFavorite = false,
  ) => {
    const numericOunces = parseFloat(ounces);

    if (!numericOunces || isNaN(numericOunces) || numericOunces <= 0) {
      console.error("Invalid ounces value:", ounces);
      return;
    }

    // Show warning if offline
    if (!hasNetwork) {
      setShowOfflineWarning(true);
    }

    // Use mutateAsync to allow caller to await the result
    await addWaterMutation.mutateAsync({
      ounces: numericOunces,
      classification,
      imageUrl,
      description,
      servings,
      liquidType,
      timestamp: currentDate.toISOString(),
      createdFromFavorite,
    });
  };

  const progress = (todayTotal / dailyGoal) * 100;

  // Track previous offset to detect changes
  const [prevOffset, setPrevOffset] = useState(timeOffsetDays);

  // Watch for time offset changes and refetch
  useEffect(() => {
    if (prevOffset !== timeOffsetDays) {
      fetchTodayTotal();
      setPrevOffset(timeOffsetDays);
    }
  }, [timeOffsetDays, fetchTodayTotal, prevOffset]);

  // ✅ Refetch goal when page comes into focus (matches history page pattern)
  useFocusEffect(
    React.useCallback(() => {
      console.log("📍 Track page focused - refetching goal");
      if (settingsInitialized) {
        refetchGoal();
      }
    }, [refetchGoal, settingsInitialized]),
  );

  const {
    selectedImage,
    setSelectedImage,
    pickImage,
    takePhoto,
    showCustomCamera,
    handleCameraCapture,
    handleCameraClose,
  } = useImagePicker();

  const {
    waterAmount,
    classification,
    liquidType: analysisLiquidType,
    analysisImageUrl,
    analyzing,
    analysisStep,
    showManualEntry: showAnalysisManualEntry,
    manualOunces: analysisManualOunces,
    setManualOunces: setAnalysisManualOunces,
    analyzeImage,
    analyzeText,
    handleManualEntry: handleAnalysisManualEntry,
    cancelAnalysis,
    resetAnalysis,
  } = useWaterAnalysis();

  const { fillAnimation, wave1X, wave2X, wave3X } = useBottleAnimation(
    todayTotal,
    dailyGoal,
  );

  const {
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
  } = useTrackWaterModals();

  const [slideAnim] = useState(new Animated.Value(0));
  const [currentPage, setCurrentPage] = useState(0);
  const horizontalScrollRef = useRef(null);

  // Get screen dimensions and calculate scale factor (same as WaterBottle)
  const screenWidth = Dimensions.get("window").width;
  const baseWidth = 390;
  const availableWidth = screenWidth - 48;
  const scale = Math.min(availableWidth / baseWidth, 1.2);

  // Slide animation when analyzing or waterAmount changes
  useEffect(() => {
    if (analyzing || waterAmount || showImagePreview) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
  }, [analyzing, waterAmount, showImagePreview]);

  // Show preview when image is selected
  useEffect(() => {
    if (selectedImage) {
      setPreviewImage(selectedImage);
      setShowImagePreview(true);
      setSelectedPercentage(null);
      setSelectedDuration(null);
    }
  }, [
    selectedImage,
    setPreviewImage,
    setShowImagePreview,
    setSelectedPercentage,
    setSelectedDuration,
  ]);

  const {
    handleCameraAction,
    handleAnalyzeText,
    handleManualAdd,
    handleContinueWithImage,
    handleCancelPreview,
    handleManualEntrySubmit,
    handleConfirmAdd,
    handleConfirmCancel,
  } = useTrackWaterHandlers({
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
  });

  // Check if data is loaded
  const isDataLoaded =
    settingsInitialized && dailyGoal !== null && !waterLoading && !goalLoading;

  // Show loading screen while data is being fetched
  if (!isDataLoaded) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
        <StatusBar style="dark" />

        {/* Offline Warning Banner - positioned absolutely at top with highest z-index */}
        {showOfflineWarning && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 60,
              left: 20,
              right: 20,
              zIndex: 99999,
              backgroundColor: "#FEF3C7",
              borderRadius: 16,
              padding: 16,
              borderWidth: 2,
              borderColor: "#F59E0B",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#92400E",
                    marginBottom: 4,
                  }}
                >
                  No Internet Connection
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#78350F",
                    lineHeight: 20,
                  }}
                >
                  There is no WiFi or cellular. Any additions made may not be
                  saved.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowOfflineWarning(false)}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#F59E0B",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={{ marginBottom: 24, paddingHorizontal: 24 }}>
            <Header progress={progress} />
          </View>

          {/* Swipeable Views: Bottle and Time Ruler */}
          <SwipeableViews
            horizontalScrollRef={horizontalScrollRef}
            onPageChange={setCurrentPage}
            currentPage={currentPage}
            fillAnimation={fillAnimation}
            wave1X={wave1X}
            wave2X={wave2X}
            wave3X={wave3X}
            todayTotal={todayTotal}
            dailyGoal={dailyGoal}
            progress={progress}
            entries={entries}
            onBottlePress={() => setShowTodayEntries(true)}
            scale={scale}
          />

          {/* Action Buttons Section */}
          <View style={{ paddingHorizontal: 24, marginTop: -8 * scale }}>
            <ActionButtons
              showTextInput={showTextInput}
              textDescription={textDescription}
              setTextDescription={setTextDescription}
              onToggleTextInput={handleToggleTextInput}
              onAnalyzeText={handleAnalyzeText}
              showCameraMenu={showCameraMenu}
              onToggleCameraMenu={handleToggleCameraMenu}
              onCameraAction={handleCameraAction}
              showManualEntry={showManualEntry}
              manualOunces={manualOunces}
              setManualOunces={setManualOunces}
              onToggleManualEntry={handleToggleManualEntry}
              onManualAdd={handleManualAdd}
              isAdding={isAdding}
              selectedFavorite={selectedFavorite}
              onSelectFavorite={setSelectedFavorite}
              onClearFavorite={() => setSelectedFavorite(null)}
              waterUnit={waterUnit} // Pass waterUnit to ActionButtons
            />
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Today Entries Sheet */}
      <TodayEntriesSheet
        visible={showTodayEntries}
        onClose={() => setShowTodayEntries(false)}
        entries={entries}
        dailyGoal={dailyGoal}
        date={currentDate} // Pass the current date so React Query can properly manage deletes
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={showImagePreview}
        previewImage={previewImage}
        selectedPercentage={selectedPercentage}
        setSelectedPercentage={setSelectedPercentage}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        servingsCount={servingsCount}
        setServingsCount={setServingsCount}
        liquidType={liquidType}
        setLiquidType={setLiquidType}
        onContinue={handleContinueWithImage}
        onCancel={handleCancelPreview}
        slideAnim={slideAnim}
      />

      {/* Sliding Analysis Modal */}
      <AnalysisModal
        visible={analyzing || waterAmount !== null}
        analyzing={analyzing}
        waterAmount={waterAmount}
        analysisStep={analysisStep}
        showManualEntry={showAnalysisManualEntry}
        manualOunces={analysisManualOunces}
        setManualOunces={setAnalysisManualOunces}
        onManualEntrySubmit={handleManualEntrySubmit}
        onCancelAnalysis={cancelAnalysis}
        onConfirmAdd={handleConfirmAdd}
        onConfirmCancel={handleConfirmCancel}
        isAdding={isAdding}
        slideAnim={slideAnim}
      />

      {/* Custom Camera Modal */}
      <Modal
        visible={showCustomCamera}
        animationType="slide"
        onRequestClose={handleCameraClose}
      >
        <CustomCamera
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      </Modal>
    </View>
  );
}
