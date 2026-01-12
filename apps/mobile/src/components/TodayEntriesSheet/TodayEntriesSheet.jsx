import { View, Modal, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useMemo } from "react";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { waterQueryKeys } from "@/hooks/useWaterEntries";
import { useTodayEntriesSheet } from "@/hooks/useTodayEntriesSheet";
import {
  getHeaderTitle,
  calculateDateString,
  calculateTotalOz,
  calculatePercentComplete,
} from "@/utils/todayEntriesHelpers";
import { OfflineWarning } from "./OfflineWarning";
import { SheetHeader } from "./SheetHeader";
import { HistoricalBanner } from "./HistoricalBanner";
import { EntriesList } from "./EntriesList";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { FavoriteLoadingModal } from "./FavoriteLoadingModal";
import { FavoriteLimitModal } from "./FavoriteLimitModal";

export function TodayEntriesSheet({
  visible,
  onClose,
  entries,
  dailyGoal,
  date,
  isHistorical = false,
  historicalMessage = null,
  loading = false,
}) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const dateString = useMemo(() => calculateDateString(date), [date]);

  const {
    slideAnim,
    confirmDelete,
    deleteHappened,
    showOfflineWarning,
    collapsingIds,
    isDeletingInProgress,
    togglingFavoriteIds,
    favoriteLoadingState,
    showFavoriteLimitModal,
    collapseAnims,
    setShowOfflineWarning,
    setDeleteHappened,
    setShowFavoriteLimitModal,
    handleDeleteEntry,
    confirmDeleteEntry,
    handleToggleFavorite,
  } = useTodayEntriesSheet(dateString);

  useEffect(() => {
    if (visible) {
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

      if (deleteHappened) {
        console.log(
          "🔄 Sheet closed after delete - refetching history in background",
        );
        queryClient.refetchQueries({
          queryKey: waterQueryKeys.history(),
        });
        setDeleteHappened(false);
      }
    }
  }, [visible, deleteHappened, queryClient, slideAnim, setDeleteHappened]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const totalOz = calculateTotalOz(entries);
  const percentComplete = calculatePercentComplete(totalOz, dailyGoal);
  const headerTitle = getHeaderTitle(date);

  const handleCancelDelete = () => {
    if (confirmDelete && !isDeletingInProgress) {
      setShowOfflineWarning(false);
    }
  };

  return (
    <>
      <OfflineWarning
        visible={showOfflineWarning}
        onDismiss={() => setShowOfflineWarning(false)}
      />

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            style={{
              height: "80%",
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 24,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 24,
              transform: [{ translateY }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
            }}
          >
            <SheetHeader
              title={headerTitle}
              totalOz={totalOz}
              dailyGoal={dailyGoal}
              percentComplete={percentComplete}
              onClose={onClose}
            />

            {isHistorical && <HistoricalBanner message={historicalMessage} />}

            <EntriesList
              entries={entries}
              loading={loading}
              isHistorical={isHistorical}
              collapsingIds={collapsingIds}
              collapseAnims={collapseAnims}
              togglingFavoriteIds={togglingFavoriteIds}
              onDeleteEntry={handleDeleteEntry}
              onToggleFavorite={handleToggleFavorite}
            />
          </Animated.View>

          <DeleteConfirmationModal
            visible={!!confirmDelete}
            ounces={confirmDelete?.ounces}
            isDeletingInProgress={isDeletingInProgress}
            onConfirm={confirmDeleteEntry}
            onCancel={handleCancelDelete}
          />

          <FavoriteLoadingModal
            visible={!!favoriteLoadingState}
            action={favoriteLoadingState?.action}
          />

          <FavoriteLimitModal
            visible={showFavoriteLimitModal}
            onClose={() => setShowFavoriteLimitModal(false)}
          />
        </View>
      </Modal>
    </>
  );
}
