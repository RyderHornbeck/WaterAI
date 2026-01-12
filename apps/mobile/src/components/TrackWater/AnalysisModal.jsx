import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  Text,
  TextInput,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useEffect } from "react";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function AnalysisModal({
  visible,
  analyzing,
  waterAmount,
  analysisStep,
  showManualEntry,
  manualOunces,
  setManualOunces,
  onManualEntrySubmit,
  onCancelAnalysis,
  onConfirmAdd,
  onConfirmCancel,
  isAdding,
  slideAnim,
}) {
  const insets = useSafeAreaInsets();
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const manualEntryPosition = useRef(new Animated.Value(0)).current;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  useEffect(() => {
    if (showManualEntry) {
      // Reset position when manual entry shows
      manualEntryPosition.setValue(0);
    }
  }, [showManualEntry]);

  const handleManualEntryFocus = () => {
    // Move to 30% screen height
    const targetPosition = SCREEN_HEIGHT * 0.3;
    Animated.spring(manualEntryPosition, {
      toValue: -targetPosition,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const handleManualEntryBlur = () => {
    // Move back to original position
    Animated.spring(manualEntryPosition, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const getPlaceholder = () => {
    return waterUnit === "liters" ? "Liters" : "Ounces";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={analyzing ? undefined : onConfirmCancel}
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
          onPress={analyzing ? undefined : onConfirmCancel}
          disabled={analyzing}
        />
        <Animated.View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 32,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
            transform: [{ translateY }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Processing overlay during analysis */}
            {analyzing && (
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#0EA5E9",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ fontSize: 48 }}>🔍</Text>
                </View>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: "#0F172A",
                    marginBottom: 12,
                  }}
                >
                  Analyzing...
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#64748B",
                    textAlign: "center",
                  }}
                >
                  {analysisStep || "Processing your image"}
                </Text>
                {showManualEntry && (
                  <Animated.View
                    style={{
                      marginTop: 24,
                      width: "100%",
                      transform: [{ translateY: manualEntryPosition }],
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#64748B",
                        marginBottom: 12,
                        textAlign: "center",
                      }}
                    >
                      Or enter manually:
                    </Text>
                    <TextInput
                      value={manualOunces}
                      onChangeText={setManualOunces}
                      placeholder={getPlaceholder()}
                      keyboardType="numeric"
                      autoFocus
                      onFocus={handleManualEntryFocus}
                      onBlur={handleManualEntryBlur}
                      style={{
                        backgroundColor: "#F8FAFC",
                        paddingVertical: 16,
                        paddingHorizontal: 20,
                        borderRadius: 16,
                        fontSize: 18,
                        color: "#0F172A",
                        marginBottom: 16,
                      }}
                    />
                    <TouchableOpacity
                      onPress={onManualEntrySubmit}
                      disabled={isAdding}
                      style={{
                        backgroundColor: isAdding ? "#94A3B8" : "#10B981",
                        paddingVertical: 16,
                        borderRadius: 16,
                        opacity: isAdding ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 17,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        {isAdding ? "Adding..." : "Add Water"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onCancelAnalysis}
                      disabled={isAdding}
                      style={{
                        marginTop: 12,
                        paddingVertical: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: "#64748B",
                          fontSize: 16,
                          textAlign: "center",
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            )}

            {/* Confirmation modal after analysis completes */}
            {!analyzing && waterAmount && (
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#10B981",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ fontSize: 48 }}>💧</Text>
                </View>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: "#0F172A",
                    marginBottom: 12,
                  }}
                >
                  Estimated Amount
                </Text>
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: "800",
                    color: "#0EA5E9",
                    marginBottom: 32,
                  }}
                >
                  {formatWaterAmount(waterAmount, waterUnit)}{" "}
                  {getUnitLabel(waterUnit)}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  <TouchableOpacity
                    onPress={onConfirmCancel}
                    disabled={isAdding}
                    style={{
                      flex: 1,
                      backgroundColor: "#F1F5F9",
                      paddingVertical: 18,
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
                    onPress={onConfirmAdd}
                    disabled={isAdding}
                    style={{
                      flex: 1,
                      backgroundColor: isAdding ? "#64748B" : "#0F172A",
                      paddingVertical: 18,
                      borderRadius: 16,
                      opacity: isAdding ? 0.9 : 1,
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
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 17,
                            fontWeight: "700",
                            textAlign: "center",
                          }}
                        >
                          Saving...
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
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
