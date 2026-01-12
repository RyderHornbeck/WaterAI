import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { Camera, Pencil, Plus, Flag, Droplet } from "lucide-react-native";
import { useRef, useEffect, useState } from "react";
import FavoritesSheet from "@/components/FavoritesSheet/FavoritesSheet";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ActionButtons({
  showTextInput,
  textDescription,
  setTextDescription,
  onToggleTextInput,
  onAnalyzeText,
  showCameraMenu,
  onToggleCameraMenu,
  onCameraAction,
  showManualEntry,
  manualOunces,
  setManualOunces,
  onToggleManualEntry,
  onManualAdd,
  isAdding = false,
  selectedFavorite,
  onSelectFavorite,
  onClearFavorite,
  waterUnit = "oz", // Default to oz if not provided
}) {
  const textInputPosition = useRef(new Animated.Value(80)).current;
  const manualEntryPosition = useRef(new Animated.Value(80)).current;
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    if (showTextInput) {
      // Reset position when modal opens
      textInputPosition.setValue(80);
    }
  }, [showTextInput]);

  useEffect(() => {
    if (showManualEntry) {
      // Reset position when modal opens
      manualEntryPosition.setValue(80);
    }
  }, [showManualEntry]);

  const handleTextInputFocus = () => {
    // Move to 30% screen height
    const targetPosition = SCREEN_HEIGHT * 0.3;
    Animated.spring(textInputPosition, {
      toValue: targetPosition,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const handleTextInputBlur = () => {
    // Move back to original position
    Animated.spring(textInputPosition, {
      toValue: 80,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const handleManualEntryFocus = () => {
    // Move to 30% screen height
    const targetPosition = SCREEN_HEIGHT * 0.3;
    Animated.spring(manualEntryPosition, {
      toValue: targetPosition,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const handleManualEntryBlur = () => {
    // Move back to original position
    Animated.spring(manualEntryPosition, {
      toValue: 80,
      useNativeDriver: false,
      bounciness: 8,
    }).start();
  };

  const handleCameraAction = (type) => {
    onCameraAction(type);
    // Close the menu after selection
    onToggleCameraMenu();
  };

  const handleSelectFavorite = (favorite) => {
    if (onSelectFavorite) {
      onSelectFavorite(favorite);
    }
    // Convert stored ounces to user's current unit before displaying
    const convertedValue = formatWaterAmount(favorite.ounces, waterUnit, false);
    setManualOunces(convertedValue);
    setShowFavorites(false);
  };

  const handleManualAdd = () => {
    onManualAdd();
  };

  const handleCloseManualEntry = () => {
    onToggleManualEntry();
    if (onClearFavorite) {
      onClearFavorite();
    }
    setManualOunces("");
  };

  const handleClearFavorite = () => {
    if (onClearFavorite) {
      onClearFavorite();
    }
    setManualOunces("");
  };

  return (
    <View
      style={{
        marginHorizontal: 0,
        position: "relative",
      }}
    >
      {/* Camera Menu Background Overlay */}
      {showCameraMenu && (
        <TouchableOpacity
          onPress={onToggleCameraMenu}
          activeOpacity={1}
          style={{
            position: "absolute",
            top: -500,
            left: -500,
            right: -500,
            bottom: -500,
            zIndex: 99,
          }}
        />
      )}

      {/* Text Input Modal */}
      {showTextInput && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: textInputPosition,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 12,
              }}
            >
              What did you drink?
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              scrollEnabled={false}
            >
              <TextInput
                value={textDescription}
                onChangeText={setTextDescription}
                placeholder="e.g., a large glass of water, 16oz bottle..."
                multiline
                autoFocus
                onFocus={handleTextInputFocus}
                onBlur={handleTextInputBlur}
                style={{
                  backgroundColor: "#F8FAFC",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#0F172A",
                  marginBottom: 12,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  onToggleTextInput();
                  setTextDescription("");
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#F1F5F9",
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 15,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAnalyzeText}
                style={{
                  flex: 1,
                  backgroundColor: "#0EA5E9",
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Analyze
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Manual Entry Input */}
      {showManualEntry && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: manualEntryPosition,
            left: 0,
            right: 0,
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
            }}
          >
            {/* Header with flag */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0F172A",
                }}
              >
                Add water manually
              </Text>
              <TouchableOpacity
                onPress={() => setShowFavorites(true)}
                style={{
                  padding: 4,
                }}
              >
                <Flag size={20} color="#FCD34D" />
              </TouchableOpacity>
            </View>

            {/* Show favorite preview if selected, otherwise show text input */}
            {selectedFavorite ? (
              <View
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
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
                  {/* Show image, description icon, or manual icon */}
                  {selectedFavorite.image_url ? (
                    <Image
                      source={{ uri: selectedFavorite.image_url }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: "#E5E7EB",
                      }}
                    />
                  ) : selectedFavorite.description ? (
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: "#3B82F6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pencil size={24} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: "#10B981",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Droplet size={24} color="#FFFFFF" />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: "#1F2937",
                      }}
                    >
                      {formatWaterAmount(selectedFavorite.ounces, waterUnit)}{" "}
                      {getUnitLabel(waterUnit)}
                    </Text>
                    {selectedFavorite.liquid_type &&
                      selectedFavorite.liquid_type !== "water" && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          {selectedFavorite.liquid_type}
                        </Text>
                      )}
                  </View>

                  <TouchableOpacity
                    onPress={handleClearFavorite}
                    style={{
                      padding: 4,
                    }}
                  >
                    <Text style={{ fontSize: 20, color: "#9CA3AF" }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TextInput
                value={manualOunces}
                onChangeText={setManualOunces}
                placeholder={
                  waterUnit === "liters" ? "Enter liters" : "Enter ounces"
                }
                keyboardType="numeric"
                onFocus={handleManualEntryFocus}
                onBlur={handleManualEntryBlur}
                style={{
                  backgroundColor: "#F8FAFC",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#0F172A",
                  marginBottom: 12,
                }}
              />
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={handleCloseManualEntry}
                disabled={isAdding}
                style={{
                  flex: 1,
                  backgroundColor: isAdding ? "#E2E8F0" : "#F1F5F9",
                  paddingVertical: 12,
                  borderRadius: 12,
                  opacity: isAdding ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 15,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleManualAdd}
                disabled={!manualOunces.trim() || isAdding}
                style={{
                  flex: 1,
                  backgroundColor: isAdding ? "#059669" : "#10B981",
                  paddingVertical: 12,
                  borderRadius: 12,
                  opacity: isAdding ? 0.8 : 1,
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
                        fontSize: 15,
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
                      fontSize: 15,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Camera Menu */}
      {showCameraMenu && (
        <View
          style={{
            position: "absolute",
            bottom: 100,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <TouchableOpacity
            onPress={() => handleCameraAction("gallery")}
            style={{
              backgroundColor: "#fff",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              marginBottom: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              borderWidth: 2,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "600" }}>
              Photo Gallery
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCameraAction("photo")}
            style={{
              backgroundColor: "#fff",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              borderWidth: 2,
              borderColor: "#E2E8F0",
            }}
          >
            <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "600" }}>
              Take Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Favorites Sheet - renders above everything */}
      <FavoritesSheet
        visible={showFavorites}
        onClose={() => setShowFavorites(false)}
        onSelectFavorite={handleSelectFavorite}
      />

      {/* Three Circular Buttons */}
      <View
        style={{
          marginHorizontal: 0,
          position: "relative",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* Left - Text Description Button */}
          <TouchableOpacity
            onPress={onToggleTextInput}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: showTextInput ? "#0EA5E9" : "#F8FAFC",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: showTextInput ? "#0EA5E9" : "#E2E8F0",
            }}
          >
            <Pencil color={showTextInput ? "#fff" : "#0F172A"} size={24} />
          </TouchableOpacity>

          {/* Middle - Camera Button (Biggest) */}
          <TouchableOpacity
            onPress={onToggleCameraMenu}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#0F172A",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
            }}
          >
            <Camera color="#fff" size={32} />
          </TouchableOpacity>

          {/* Right - Manual Entry Button */}
          <TouchableOpacity
            onPress={onToggleManualEntry}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: showManualEntry ? "#10B981" : "#F8FAFC",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: showManualEntry ? "#10B981" : "#E2E8F0",
            }}
          >
            <Plus color={showManualEntry ? "#fff" : "#0F172A"} size={24} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
