import { useState, useEffect, useRef } from "react";
import { Animated, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteWaterEntry, waterQueryKeys } from "@/hooks/useWaterEntries";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export function useTodayEntriesSheet(dateString) {
  const [slideAnim] = useState(new Animated.Value(0));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteHappened, setDeleteHappened] = useState(false);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const [collapsingIds, setCollapsingIds] = useState(new Set());
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  const [togglingFavoriteIds, setTogglingFavoriteIds] = useState(new Set());
  const [favoriteLoadingState, setFavoriteLoadingState] = useState(null);
  const [showFavoriteLimitModal, setShowFavoriteLimitModal] = useState(false);
  const collapseAnims = useRef(new Map());

  const queryClient = useQueryClient();
  const { hasNetwork } = useNetworkStatus();
  const deleteMutation = useDeleteWaterEntry(dateString);

  // Auto-hide offline warning after 5 seconds
  useEffect(() => {
    if (showOfflineWarning) {
      const timer = setTimeout(() => {
        setShowOfflineWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineWarning]);

  const handleDeleteEntry = async (entryId, ounces) => {
    if (!hasNetwork) {
      setShowOfflineWarning(true);
    }
    setConfirmDelete({ id: entryId, ounces });
  };

  const confirmDeleteEntry = async () => {
    if (!confirmDelete || isDeletingInProgress) return;

    const { id } = confirmDelete;

    setIsDeletingInProgress(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      await deleteMutation.mutateAsync(id);
      setConfirmDelete(null);
      setIsDeletingInProgress(false);

      await new Promise((resolve) => setTimeout(resolve, 300));

      setCollapsingIds((prev) => new Set([...prev, id]));

      if (!collapseAnims.current.has(id)) {
        collapseAnims.current.set(id, new Animated.Value(1));
      }

      const collapseAnim = collapseAnims.current.get(id);

      Animated.timing(collapseAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          collapseAnims.current.delete(id);
          setCollapsingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        }, 100);
      });

      setDeleteHappened(true);
    } catch (error) {
      setConfirmDelete(null);
      setIsDeletingInProgress(false);
    }
  };

  const handleToggleFavorite = async (
    entryId,
    currentFavoriteState,
    createdFromFavorite = false,
  ) => {
    if (!hasNetwork) {
      setShowOfflineWarning(true);
      return;
    }

    // Remove cooldown check - favoriting is not adding new water!

    setFavoriteLoadingState({
      action: currentFavoriteState ? "unfavoriting" : "favoriting",
    });

    setTogglingFavoriteIds((prev) => new Set([...prev, entryId]));

    try {
      // Special case: If this was created from a favorite, unfavorite the original
      if (createdFromFavorite) {
        const response = await fetchWithAuth("/api/unfavorite-copy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            copyEntryId: entryId,
          }),
        });

        if (response.ok) {
          queryClient.refetchQueries({
            queryKey: waterQueryKeys.today(dateString),
          });
          queryClient.invalidateQueries({
            queryKey: ["favorites"],
          });
        } else {
          console.error("Failed to unfavorite original");
        }
      } else {
        // Normal case: toggle this entry's favorite state
        const response = await fetchWithAuth(`/api/water-entry/${entryId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_favorited: !currentFavoriteState,
          }),
        });

        if (response.ok) {
          // Remove recordAdd() - not adding new water!

          queryClient.refetchQueries({
            queryKey: waterQueryKeys.today(dateString),
          });
          queryClient.invalidateQueries({
            queryKey: ["favorites"],
          });
        } else if (response.status === 429) {
          // Check if it's a favorites limit error
          const error = await response.json();
          if (error.favoritesLimitReached) {
            setShowFavoriteLimitModal(true);
          } else {
            console.error("Failed to toggle favorite:", error);
          }
        } else {
          console.error("Failed to toggle favorite");
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setTogglingFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(entryId);
        return newSet;
      });
      setTimeout(() => {
        setFavoriteLoadingState(null);
      }, 300);
    }
  };

  return {
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
  };
}
