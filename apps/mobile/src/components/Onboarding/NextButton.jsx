import { View, Text, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

export function NextButton({
  onNext,
  canProceed,
  isSubmitting,
  isLastQuestion,
  questionType,
  bottlesCount,
  insets,
  onSignIn,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (canProceed && !isSubmitting) {
      scale.value = withSpring(0.97);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (canProceed && !isSubmitting) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      scale.value = withSequence(
        withTiming(1.03, { duration: 100 }),
        withSpring(1),
      );
      onNext();
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return "Saving...";
    if (isLastQuestion) return "Get Started";
    if (questionType === "water-ai-explainer") return "I Understand";
    if (questionType === "ui-tutorial") return "Got It!";
    if (questionType === "bottles") return "Continue";
    if (questionType === "welcome") return "Let's Go";
    if (questionType === "stat") return "Continue";
    return "Next";
  };

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        paddingTop: 20,
        backgroundColor: "#F0F9FF",
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
      }}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!canProceed || isSubmitting}
          style={{
            backgroundColor:
              canProceed && !isSubmitting ? "#0EA5E9" : "#CBD5E1",
            paddingVertical: 18,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: canProceed && !isSubmitting ? "#0EA5E9" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canProceed && !isSubmitting ? 0.3 : 0.1,
            shadowRadius: 8,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              marginRight: 8,
            }}
          >
            {getButtonText()}
          </Text>
          {!isSubmitting && <ChevronRight color="#fff" size={24} />}
        </Pressable>
      </Animated.View>

      {/* Sign In Button - only show on welcome screen */}
      {questionType === "welcome" && onSignIn && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSignIn();
          }}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            marginTop: 16,
            borderWidth: 2,
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1E293B" }}>
            Sign in
          </Text>
        </Pressable>
      )}

      {questionType === "bottles" && bottlesCount === 0 && !isSubmitting && (
        <Pressable
          onPress={onNext}
          style={{
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: "#64748B", fontWeight: "600" }}>
            Skip for now
          </Text>
        </Pressable>
      )}
    </View>
  );
}
