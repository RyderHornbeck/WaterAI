import { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  ZoomIn,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
  Easing,
} from "react-native-reanimated";

export function BrainTriviaQuestion({
  options,
  correctAnswer,
  revealTitle,
  revealMessage,
  currentAnswer,
  onAnswer,
}) {
  const [showReveal, setShowReveal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(currentAnswer || null);

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <BrainReveal
          selectedAnswer={selectedAnswer}
          correctAnswer={correctAnswer}
          revealTitle={revealTitle}
          revealMessage={revealMessage}
        />
      </View>
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

function BrainReveal({
  selectedAnswer,
  correctAnswer,
  revealTitle,
  revealMessage,
}) {
  const fillHeight = useSharedValue(0);
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);

  useEffect(() => {
    // Animate fill to 73%
    fillHeight.value = withDelay(
      300,
      withTiming(0.73, {
        duration: 2000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );

    // Continuous wave animations
    wave1.value = withDelay(
      300,
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
    );

    wave2.value = withDelay(
      500,
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
    );

    wave3.value = withDelay(
      700,
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
    );
  }, []);

  const fillStyle = useAnimatedStyle(() => {
    return {
      height: `${fillHeight.value * 100}%`,
    };
  });

  const wave1Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: wave1.value * -8 }],
      opacity: 0.6,
    };
  });

  const wave2Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: wave2.value * -6 }],
      opacity: 0.5,
    };
  });

  const wave3Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: wave3.value * -10 }],
      opacity: 0.4,
    };
  });

  return (
    <Animated.View
      entering={ZoomIn.duration(600)}
      style={{
        alignItems: "center",
      }}
    >
      {/* Animated Brain with Water Fill */}
      <View
        style={{
          width: 180,
          height: 180,
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
          borderRadius: 90,
        }}
      >
        {/* Brain outline/background */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 90,
            borderWidth: 4,
            borderColor:
              selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
            backgroundColor: "#F0F9FF",
            justifyContent: "flex-end",
            overflow: "hidden",
          }}
        >
          {/* Water fill with waves */}
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor:
                  selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
                opacity: 0.3,
              },
              fillStyle,
            ]}
          />

          {/* Wave layers */}
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "73%",
                backgroundColor:
                  selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
              },
              wave1Style,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "73%",
                backgroundColor:
                  selectedAnswer === correctAnswer ? "#059669" : "#0284C7",
              },
              wave2Style,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "73%",
                backgroundColor:
                  selectedAnswer === correctAnswer ? "#10B981" : "#0EA5E9",
              },
              wave3Style,
            ]}
          />
        </View>

        {/* Brain emoji on top */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 80 }}>🧠</Text>
        </View>
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
        }}
      >
        {revealMessage}
      </Animated.Text>
    </Animated.View>
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
