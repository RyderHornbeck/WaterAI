import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";

export function ChoiceQuestion({ options, currentAnswer, onAnswer }) {
  const [customValue, setCustomValue] = useState(
    currentAnswer && !options.find((opt) => opt.value === currentAnswer)
      ? currentAnswer
      : "",
  );

  const handleSelect = (value) => {
    onAnswer(value);
  };

  const handleCustomChange = (text) => {
    setCustomValue(text);
    if (text.trim()) {
      onAnswer(text.trim());
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {options.map((option, index) => (
        <Animated.View
          key={option.value}
          entering={FadeInDown.delay(index * 80).duration(600)}
        >
          {option.value === "custom" ? (
            <CustomOption
              option={option}
              customValue={customValue}
              onCustomChange={handleCustomChange}
              isSelected={customValue.trim() !== ""}
            />
          ) : (
            <ChoiceOption
              option={option}
              isSelected={currentAnswer === option.value}
              onSelect={() => handleSelect(option.value)}
            />
          )}
        </Animated.View>
      ))}
    </View>
  );
}

function CustomOption({ option, customValue, onCustomChange, isSelected }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={{
          backgroundColor: isSelected ? "#0EA5E9" : "#FFFFFF",
          padding: 20,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: isSelected ? "#0EA5E9" : "#E2E8F0",
          shadowColor: isSelected ? "#0EA5E9" : "#000",
          shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
          shadowOpacity: isSelected ? 0.2 : 0.05,
          shadowRadius: isSelected ? 8 : 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
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
          {option.subtitle && (
            <Text
              style={{
                fontSize: 14,
                color: isSelected ? "#E0F2FE" : "#64748B",
              }}
            >
              {option.subtitle}
            </Text>
          )}
        </View>
        <TextInput
          value={customValue}
          onChangeText={onCustomChange}
          placeholder="Enter amount (oz)"
          placeholderTextColor={isSelected ? "#BAE6FD" : "#94A3B8"}
          keyboardType="numeric"
          style={{
            backgroundColor: isSelected
              ? "rgba(255, 255, 255, 0.2)"
              : "#F8FAFC",
            borderRadius: 12,
            padding: 14,
            fontSize: 16,
            color: isSelected ? "#FFFFFF" : "#1E293B",
            borderWidth: 1,
            borderColor: isSelected ? "rgba(255, 255, 255, 0.3)" : "#E2E8F0",
          }}
        />
      </View>
    </Animated.View>
  );
}

function ChoiceOption({ option, isSelected, onSelect }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(1.02, { duration: 100 }),
      withSpring(1),
    );
    onSelect();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: isSelected ? "#0EA5E9" : "#FFFFFF",
          padding: 20,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: isSelected ? "#0EA5E9" : "#E2E8F0",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
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
        {option.subtitle && (
          <Text
            style={{
              fontSize: 14,
              color: isSelected ? "#E0F2FE" : "#64748B",
            }}
          >
            {option.subtitle}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
