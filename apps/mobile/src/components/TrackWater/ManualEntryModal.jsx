import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { Flag, X } from "lucide-react-native";
import { useState } from "react";
import FavoritesSheet from "@/components/FavoritesSheet/FavoritesSheet";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function ManualEntryModal({
  visible,
  manualOunces,
  setManualOunces,
  onClose,
  onAdd,
  isAdding = false,
  selectedFavorite,
  onSelectFavorite,
  onClearFavorite,
}) {
  const [showFavorites, setShowFavorites] = useState(false);
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  const handleClose = () => {
    onClose();
    setManualOunces("");
    if (onClearFavorite) {
      onClearFavorite();
    }
  };

  const handleSelectFavorite = (favorite) => {
    if (onSelectFavorite) {
      onSelectFavorite(favorite);
    }
    // Convert stored ounces to user's current unit (oz or L) before displaying
    const convertedValue = formatWaterAmount(favorite.ounces, waterUnit, false);
    setManualOunces(convertedValue);
  };

  const handleClearFavorite = () => {
    if (onClearFavorite) {
      onClearFavorite();
    }
    setManualOunces("");
  };

  const handleAdd = () => {
    // Guard: prevent adding if no ounces entered or already adding
    if (!manualOunces.trim() || isAdding) {
      return;
    }
    onAdd();
  };

  const formatClassification = (classification) => {
    if (!classification) return "";
    // Special case for smoothie
    if (classification === "smoothie") return "Smoothie/Protein Shake";
    return classification
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getPlaceholder = () => {
    return "Enter amount";
  };

  // Helper to display favorite amount in current unit
  const getFavoriteDisplayAmount = (ounces) => {
    // Always convert from stored ounces to current user unit
    return formatWaterAmount(ounces, waterUnit, false);
  };

  const getFavoriteDisplayUnit = () => {
    return getUnitLabel(waterUnit);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
            }}
            activeOpacity={1}
            onPress={handleClose}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: "100%",
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              {/* Header with favorites button */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#0F172A",
                    flex: 1,
                  }}
                >
                  Add water manually
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFavorites(true)}
                  style={{
                    padding: 8,
                    marginRight: -8,
                  }}
                >
                  <Flag size={24} color="#FCD34D" />
                </TouchableOpacity>
              </View>

              {/* Content - either favorite preview or text input */}
              {selectedFavorite ? (
                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: "#FCD34D",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Image or Icon - matching TodayEntriesSheet exactly */}
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: selectedFavorite.image_url
                          ? "#E2E8F0"
                          : selectedFavorite.classification === "description"
                            ? "#3B82F6"
                            : "#10B981",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selectedFavorite.image_url ? (
                        <Image
                          source={{ uri: selectedFavorite.image_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : selectedFavorite.classification === "description" ? (
                        <Text style={{ fontSize: 40 }}>✏️</Text>
                      ) : (
                        <Text style={{ fontSize: 40 }}>💧</Text>
                      )}
                    </View>

                    {/* Details - matching TodayEntriesSheet exactly */}
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "700",
                          color: "#0EA5E9",
                          marginBottom: 4,
                        }}
                      >
                        {/* ✅ Always show in user's preferred unit */}
                        {formatWaterAmount(selectedFavorite.ounces, waterUnit)}{" "}
                        {getUnitLabel(waterUnit)}
                      </Text>

                      {selectedFavorite.classification && (
                        <View style={{ flexDirection: "row", marginBottom: 4 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "600",
                              color: "#3B82F6",
                            }}
                          >
                            {formatClassification(
                              selectedFavorite.classification,
                            )}
                          </Text>
                          {selectedFavorite.servings &&
                            selectedFavorite.servings > 1 && (
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "600",
                                  color: "#000000",
                                }}
                              >
                                {` x ${selectedFavorite.servings}`}
                              </Text>
                            )}
                        </View>
                      )}

                      {selectedFavorite.liquid_type &&
                        selectedFavorite.liquid_type !== "water" && (
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "500",
                              color: "#64748B",
                              marginBottom: 4,
                            }}
                          >
                            {selectedFavorite.liquid_type === "smoothie"
                              ? "Smoothie/Protein Shake"
                              : selectedFavorite.liquid_type
                                  .charAt(0)
                                  .toUpperCase() +
                                selectedFavorite.liquid_type.slice(1)}
                          </Text>
                        )}

                      {selectedFavorite.description && (
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#0F172A",
                            marginBottom: 4,
                          }}
                          numberOfLines={2}
                        >
                          {selectedFavorite.description}
                        </Text>
                      )}
                    </View>

                    {/* Close button */}
                    <TouchableOpacity
                      onPress={handleClearFavorite}
                      style={{
                        padding: 8,
                      }}
                    >
                      <X size={24} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TextInput
                  value={manualOunces}
                  onChangeText={setManualOunces}
                  placeholder={getPlaceholder()}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#F8FAFC",
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    fontSize: 18,
                    color: "#0F172A",
                    marginBottom: 16,
                  }}
                  autoFocus
                  editable={!isAdding}
                />
              )}

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isAdding}
                  style={{
                    flex: 1,
                    backgroundColor: isAdding ? "#E2E8F0" : "#F1F5F9",
                    paddingVertical: 16,
                    borderRadius: 16,
                    opacity: isAdding ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: "#64748B",
                      fontSize: 17,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{
                    flex: 1,
                    backgroundColor: "#10B981",
                    paddingVertical: 16,
                    borderRadius: 16,
                  }}
                >
                  {isAdding ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <ActivityIndicator size="small" color="#fff" />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 17,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        Adding...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                    >
                      Add
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Favorites Sheet */}
      <FavoritesSheet
        visible={showFavorites}
        onClose={() => setShowFavorites(false)}
        onSelectFavorite={handleSelectFavorite}
      />
    </>
  );
}
