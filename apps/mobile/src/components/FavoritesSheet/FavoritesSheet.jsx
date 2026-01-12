import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flag, X, Trash2 } from "lucide-react-native";
import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useCooldownStore from "@/stores/useCooldownStore";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export default function FavoritesSheet({ visible, onClose, onSelectFavorite }) {
  const insets = useSafeAreaInsets();
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const [slideAnim] = useState(new Animated.Value(0));
  const queryClient = useQueryClient();
  const [confirmUnfavorite, setConfirmUnfavorite] = useState(null); // Stores the entry to unfavorite
  const { canAdd, getRemainingCooldown } = useCooldownStore();

  // Use React Query for instant cached loading
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/favorites");
      if (response.ok) {
        const data = await response.json();
        // Reverse the order so most recent is at the top
        return (data.favorites || []).reverse();
      }
      return [];
    },
    staleTime: 30000, // 30 seconds - data stays fresh
    cacheTime: 300000, // 5 minutes - keep in cache
  });

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
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const handleUnfavorite = async (favoriteId) => {
    // Close the confirmation popup
    setConfirmUnfavorite(null);

    // Optimistic update - remove immediately from UI
    queryClient.setQueryData(
      ["favorites"],
      (old) => old?.filter((fav) => fav.id !== favoriteId) || [],
    );

    try {
      const response = await fetchWithAuth(`/api/favorites?id=${favoriteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
      } else {
        // Also invalidate water entries to update main list
        queryClient.invalidateQueries({ queryKey: ["water-entries"] });
      }
    } catch (error) {
      console.error("Error unfavoriting:", error);
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    }
  };

  const handleSelectFavorite = (favorite) => {
    // Check cooldown before allowing selection
    if (!canAdd()) {
      const remainingSeconds = getRemainingCooldown();
      Alert.alert(
        "Please Wait",
        `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""} before adding water again.`,
        [{ text: "OK" }],
      );
      return;
    }

    onSelectFavorite(favorite);
    onClose();
  };

  const formatClassification = (classification) => {
    if (!classification) return "";
    if (classification === "smoothie") return "Smoothie/Protein Shake";
    return classification
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
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
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Flag size={24} color="#FCD34D" fill="#FCD34D" />
              <Text
                style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}
              >
                Favorites
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <ActivityIndicator size="large" color="#0EA5E9" />
              </View>
            ) : favorites.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: 60 }}>
                <Flag size={48} color="#D1D5DB" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#374151",
                    marginTop: 16,
                  }}
                >
                  No favorites yet
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6B7280",
                    marginTop: 8,
                    textAlign: "center",
                    paddingHorizontal: 40,
                  }}
                >
                  Tap the flag icon on any entry to save it as a favorite for
                  quick access
                </Text>
              </View>
            ) : (
              favorites.map((favorite) => {
                const isImageEntry = favorite.image_url;
                const isDescriptionEntry =
                  favorite.classification === "description";

                return (
                  <TouchableOpacity
                    key={favorite.id}
                    onPress={() => handleSelectFavorite(favorite)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#F8FAFC",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      {/* Left side - Image or Icon */}
                      <View
                        style={{
                          width: 80,
                          height: 80,
                          marginRight: 16,
                          borderRadius: 12,
                          overflow: "hidden",
                          backgroundColor: isImageEntry
                            ? "#E2E8F0"
                            : isDescriptionEntry
                              ? "#3B82F6"
                              : "#10B981",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isImageEntry ? (
                          <Image
                            source={{ uri: favorite.image_url }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />
                        ) : isDescriptionEntry ? (
                          <Text style={{ fontSize: 40 }}>✏️</Text>
                        ) : (
                          <Text style={{ fontSize: 40 }}>💧</Text>
                        )}
                      </View>

                      {/* Middle - Details */}
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#0EA5E9",
                            marginBottom: 4,
                          }}
                        >
                          {formatWaterAmount(favorite.ounces, waterUnit)}{" "}
                          {getUnitLabel(waterUnit)}
                        </Text>

                        {favorite.classification && (
                          <View
                            style={{ flexDirection: "row", marginBottom: 4 }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: "#3B82F6",
                              }}
                            >
                              {formatClassification(favorite.classification)}
                            </Text>
                            {favorite.servings && favorite.servings > 1 && (
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "600",
                                  color: "#000000",
                                }}
                              >
                                {` x ${favorite.servings}`}
                              </Text>
                            )}
                          </View>
                        )}

                        {favorite.liquid_type &&
                          favorite.liquid_type !== "water" && (
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "500",
                                color: "#64748B",
                                marginBottom: 4,
                              }}
                            >
                              {favorite.liquid_type === "smoothie"
                                ? "Smoothie/Protein Shake"
                                : favorite.liquid_type.charAt(0).toUpperCase() +
                                  favorite.liquid_type.slice(1)}
                            </Text>
                          )}

                        {favorite.description && (
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#0F172A",
                              marginBottom: 4,
                            }}
                            numberOfLines={2}
                          >
                            {favorite.description}
                          </Text>
                        )}
                      </View>

                      {/* Right side - Trash icon to unfavorite */}
                      <TouchableOpacity
                        onPress={() => setConfirmUnfavorite(favorite)}
                        style={{
                          alignSelf: "center",
                          padding: 8,
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Custom Confirmation Popup */}
      <Modal
        visible={confirmUnfavorite !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmUnfavorite(null)}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 340,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Remove Favorite
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#64748B",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              Are you sure you want to unfavorite this entry?
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmUnfavorite(null)}
                style={{
                  flex: 1,
                  backgroundColor: "#F1F5F9",
                  paddingVertical: 14,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUnfavorite(confirmUnfavorite.id)}
                style={{
                  flex: 1,
                  backgroundColor: "#DC2626",
                  paddingVertical: 14,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Unfavorite
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}
