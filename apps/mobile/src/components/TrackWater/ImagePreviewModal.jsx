import {
  Modal,
  View,
  TouchableOpacity,
  Animated,
  Image,
  ScrollView,
  Text,
  TextInput,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Minus } from "lucide-react-native";
import { useRef } from "react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ImagePreviewModal({
  visible,
  previewImage,
  selectedPercentage,
  setSelectedPercentage,
  selectedDuration,
  setSelectedDuration,
  servingsCount,
  setServingsCount,
  liquidType,
  setLiquidType,
  onContinue,
  onCancel,
  slideAnim,
}) {
  const insets = useSafeAreaInsets();
  const liquidTypePosition = useRef(new Animated.Value(0)).current;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const handleLiquidTypeFocus = () => {
    // Move to 30% screen height
    const targetPosition = SCREEN_HEIGHT * 0.3;
    Animated.spring(liquidTypePosition, {
      toValue: -targetPosition,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const handleLiquidTypeBlur = () => {
    // Move back to original position
    Animated.spring(liquidTypePosition, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const percentages = [20, 40, 60, 80, 100];
  const durations = ["1 sec", "3 sec", "5 sec", "10 sec", "15 sec"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
          onPress={onCancel}
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Image Display */}
            {previewImage && (
              <View
                style={{
                  width: "100%",
                  height: 300,
                  borderRadius: 16,
                  overflow: "hidden",
                  marginBottom: 24,
                  backgroundColor: "#F1F5F9",
                }}
              >
                <Image
                  source={{ uri: previewImage.uri }}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Percentage Question */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 16,
              }}
            >
              How much did you drink from this container?
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {percentages.map((percent) => (
                <TouchableOpacity
                  key={percent}
                  onPress={() => {
                    setSelectedPercentage(percent);
                    setSelectedDuration(null);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    backgroundColor:
                      selectedPercentage === percent ? "#0EA5E9" : "#F1F5F9",
                    borderWidth: 2,
                    borderColor:
                      selectedPercentage === percent ? "#0EA5E9" : "#E2E8F0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color:
                        selectedPercentage === percent ? "#fff" : "#64748B",
                    }}
                  >
                    {percent}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration Question */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 16,
              }}
            >
              Or, how long did you drink?
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {durations.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  onPress={() => {
                    setSelectedDuration(duration);
                    setSelectedPercentage(null);
                  }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    backgroundColor:
                      selectedDuration === duration ? "#10B981" : "#F1F5F9",
                    borderWidth: 2,
                    borderColor:
                      selectedDuration === duration ? "#10B981" : "#E2E8F0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: selectedDuration === duration ? "#fff" : "#64748B",
                    }}
                  >
                    {duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Servings Question */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 16,
              }}
            >
              How many servings?
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 32,
              }}
            >
              <TouchableOpacity
                onPress={() => setServingsCount(Math.max(1, servingsCount - 1))}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#F1F5F9",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Minus size={24} color="#64748B" />
              </TouchableOpacity>

              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginHorizontal: 32,
                  minWidth: 40,
                  textAlign: "center",
                }}
              >
                {servingsCount}
              </Text>

              <TouchableOpacity
                onPress={() => setServingsCount(servingsCount + 1)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#0EA5E9",
                  borderWidth: 2,
                  borderColor: "#0EA5E9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Liquid Type Question */}
            <Animated.View
              style={{
                transform: [{ translateY: liquidTypePosition }],
                backgroundColor: "#fff",
                paddingVertical: 16,
                paddingHorizontal: 16,
                marginHorizontal: -16,
                borderRadius: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#0F172A",
                  marginBottom: 8,
                }}
              >
                What are you drinking?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#64748B",
                  marginBottom: 12,
                }}
              >
                If brand name or liquid isn't visible, AI will assume the
                contents, unless you specify otherwise below.
              </Text>
              <TextInput
                value={liquidType}
                onChangeText={setLiquidType}
                placeholder="e.g., Gatorade, Coffee, Green Tea (optional)"
                placeholderTextColor="#94A3B8"
                onFocus={handleLiquidTypeFocus}
                onBlur={handleLiquidTypeBlur}
                style={{
                  backgroundColor: "#F8FAFC",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#0F172A",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  marginBottom: 16,
                }}
              />
            </Animated.View>

            {/* Continue Button */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 16,
              }}
            >
              <TouchableOpacity
                onPress={onCancel}
                style={{
                  flex: 1,
                  backgroundColor: "#F1F5F9",
                  paddingVertical: 18,
                  borderRadius: 16,
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
                onPress={onContinue}
                disabled={!selectedPercentage && !selectedDuration}
                style={{
                  flex: 1,
                  backgroundColor:
                    selectedPercentage || selectedDuration
                      ? "#0F172A"
                      : "#E2E8F0",
                  paddingVertical: 18,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedPercentage || selectedDuration
                        ? "#fff"
                        : "#94A3B8",
                    fontSize: 17,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
