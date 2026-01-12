import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeOutUp,
  ZoomIn,
  BounceIn,
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

export function TriviaQuestion({
  options,
  correctAnswer,
  revealTitle,
  revealMessage,
  revealStats,
  currentAnswer,
  onAnswer,
}) {
  const [showReveal, setShowReveal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(currentAnswer || null);

  // Reset reveal when navigating back
  useEffect(() => {
    if (currentAnswer) {
      setSelectedAnswer(currentAnswer);
      setShowReveal(true);
    } else {
      setShowReveal(false);
      setSelectedAnswer(null);
    }
  }, [currentAnswer]);

  const handleSelect = (value) => {
    setSelectedAnswer(value);
    onAnswer(value);

    // Wait 400ms then show reveal
    setTimeout(() => {
      setShowReveal(true);
    }, 400);
  };

  if (showReveal) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 40,
          paddingBottom: 120, // Extra padding for next button
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={ZoomIn.duration(600)}
          style={{
            alignItems: "center",
            width: "100%",
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor:
                selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 32,
              shadowColor:
                selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}
          >
            <Text style={{ fontSize: 56 }}>
              {selectedAnswer === correctAnswer ? "✓" : "💧"}
            </Text>
          </View>

          <Animated.Text
            entering={FadeIn.delay(300).duration(600)}
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1E293B",
              textAlign: "center",
              marginBottom: 16,
              paddingHorizontal: 20,
            }}
          >
            {revealTitle}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(500).duration(600)}
            style={{
              fontSize: 18,
              color: "#64748B",
              textAlign: "center",
              lineHeight: 28,
              paddingHorizontal: 32,
              marginBottom: 16,
            }}
          >
            {revealMessage}
          </Animated.Text>

          {/* Animated Stat Cards */}
          {revealStats && revealStats.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                marginTop: 16,
                paddingHorizontal: 20,
              }}
            >
              {revealStats.map((stat, index) => (
                <Animated.View
                  key={index}
                  entering={FadeIn.delay(700 + index * 150).duration(500)}
                  style={{
                    backgroundColor: "#F0F9FF",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                    minWidth: 140,
                    borderWidth: 1,
                    borderColor: "#BAE6FD",
                  }}
                >
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>
                    {stat.icon}
                  </Text>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: "#0EA5E9",
                      marginBottom: 4,
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#64748B",
                      textAlign: "center",
                    }}
                  >
                    {stat.label}
                  </Text>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {options.map((option, index) => {
        const isSelected = selectedAnswer === option.value;

        return (
          <Animated.View
            key={option.value}
            entering={FadeInDown.delay(index * 100).duration(600)}
          >
            <TriviaOption
              option={option}
              isSelected={isSelected}
              onSelect={() => handleSelect(option.value)}
              disabled={selectedAnswer !== null}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function TriviaOption({ option, isSelected, onSelect, disabled }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      scale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(1),
      );
      onSelect();
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{
          backgroundColor: isSelected ? "#0EA5E9" : "#FFFFFF",
          borderRadius: 16,
          padding: 20,
          borderWidth: 2,
          borderColor: isSelected ? "#0EA5E9" : "#E2E8F0",
          shadowColor: isSelected ? "#0EA5E9" : "#000",
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.2 : 0.05,
          shadowRadius: isSelected ? 8 : 4,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: isSelected ? "#FFFFFF" : "#1E293B",
          }}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
