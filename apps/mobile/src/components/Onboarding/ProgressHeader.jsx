import { View, Text, Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

export function ProgressHeader({
  currentQuestionIndex,
  totalQuestions,
  progress,
  onBack,
  insets,
}) {
  const progressWidth = useSharedValue(0);
  const backButtonScale = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withTiming(progress * 100, { duration: 400 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  const backButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: backButtonScale.value }],
    };
  });

  const handleBackPress = () => {
    backButtonScale.value = withSpring(0.9, {}, () => {
      backButtonScale.value = withSpring(1);
    });
    onBack();
  };

  // Show "Water AI" on welcome screen (Q0)
  if (currentQuestionIndex === 0) {
    return (
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#000000",
          }}
        >
          Water AI
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        paddingTop: insets.top + 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        {currentQuestionIndex > 0 && (
          <Animated.View style={backButtonStyle}>
            <Pressable
              onPress={handleBackPress}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <ChevronLeft color="#0EA5E9" size={24} />
            </Pressable>
          </Animated.View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 8 }}>
            Question {currentQuestionIndex} of {totalQuestions - 1}
          </Text>
          <View
            style={{
              height: 6,
              backgroundColor: "#E2E8F0",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={[
                {
                  height: 6,
                  backgroundColor: "#0EA5E9",
                  borderRadius: 3,
                },
                progressStyle,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
