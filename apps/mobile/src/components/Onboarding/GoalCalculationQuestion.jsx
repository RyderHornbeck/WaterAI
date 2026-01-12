import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ozToLiters } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function GoalCalculationQuestion({ value, onChange, allAnswers }) {
  const insets = useSafeAreaInsets();
  const [calculating, setCalculating] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [calculatedGoal, setCalculatedGoal] = useState(null);
  const [selectedOption, setSelectedOption] = useState(value?.option || null);
  const [customAmount, setCustomAmount] = useState(value?.customAmount || "");

  // Get user's preferred unit from store
  const waterUnit =
    useUserSettingsStore((state) => state.waterUnit) ||
    allAnswers.waterUnit ||
    "oz";

  const progressValue = useSharedValue(0);

  const steps = [
    { label: "Converting measurements", icon: "📏" },
    { label: "Calculating base goal", icon: "💧" },
    { label: "Activity adjustment", icon: "🏃" },
    { label: "Age adjustment", icon: "🎂" },
    { label: "Gender modifier", icon: "⚧️" },
    { label: "Goal-based adjustment", icon: "🎯" },
    { label: "Environment adjustment", icon: "🌡️" },
    { label: "Finalizing your goal", icon: "✨" },
  ];

  useEffect(() => {
    // Start calculation animation
    let stepIndex = 0;
    const stepDuration = 5000 / steps.length;

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        progressValue.value = withSpring((stepIndex + 1) / steps.length);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        stepIndex++;
      } else {
        clearInterval(interval);
        // Calculate the actual goal
        const goal = calculateDailyGoal(allAnswers);
        setCalculatedGoal(goal);
        setCalculating(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  const calculateDailyGoal = (answers) => {
    // ===== Step 1: Get weight in pounds =====
    let W;
    if (answers.heightWeight?.unit === "imperial") {
      W = answers.heightWeight.weightLbs;
    } else {
      // Convert kg to lbs
      W = answers.heightWeight.weightKg * 2.20462;
    }

    // ===== Step 2: Sex coefficient =====
    let SexCoef;
    if (answers.gender === "male") {
      SexCoef = 0.5;
    } else if (answers.gender === "female") {
      SexCoef = 0.45;
    } else {
      // Non-binary: use average
      SexCoef = 0.475;
    }

    // ===== Step 3: Workout adjustment (bucketed) =====
    let WorkoutAdj;
    const workoutAnswer = answers.workoutsPerWeek;
    if (workoutAnswer === "0") {
      WorkoutAdj = 0; // 0-1 times
    } else if (workoutAnswer === "2") {
      WorkoutAdj = 6; // 2-3 times
    } else if (workoutAnswer === "5") {
      WorkoutAdj = 10; // 4-5 times
    } else if (workoutAnswer === "7") {
      WorkoutAdj = 14; // 6+ times
    } else {
      WorkoutAdj = 6; // default to moderate
    }

    // ===== Step 4: Age adjustment =====
    let AgeAdj;
    const age = answers.age;
    if (age < 18) {
      AgeAdj = 2;
    } else if (age >= 18 && age <= 29) {
      AgeAdj = 0;
    } else if (age >= 30 && age <= 44) {
      AgeAdj = -2;
    } else if (age >= 45 && age <= 59) {
      AgeAdj = -5;
    } else {
      // age >= 60
      AgeAdj = -8;
    }

    // ===== Step 5: Goal adjustment =====
    let GoalAdj;
    if (answers.waterGoal === "lose") {
      GoalAdj = 3;
    } else if (answers.waterGoal === "healthy") {
      GoalAdj = 0;
    } else if (answers.waterGoal === "gain") {
      GoalAdj = 5;
    } else {
      GoalAdj = 0; // default
    }

    // ===== Step 6: Sweat adjustment =====
    let SweatAdj;
    const sweatLevel = answers.sweatLevel || "normal";
    if (sweatLevel === "low") {
      SweatAdj = 0;
    } else if (sweatLevel === "normal") {
      SweatAdj = 4;
    } else if (sweatLevel === "high") {
      SweatAdj = 8;
    } else {
      SweatAdj = 4; // default to moderate
    }

    // ===== Step 7: Climate adjustment =====
    let ClimateAdj;
    const climate = answers.climate || "temperate";
    if (climate === "cold") {
      ClimateAdj = -2;
    } else if (climate === "temperate") {
      ClimateAdj = 0;
    } else if (climate === "hot") {
      ClimateAdj = 4;
    } else {
      ClimateAdj = 0; // default
    }

    // ===== Step 8: Environment cap (keeps it small) =====
    const EnvCapped = Math.min(8, Math.max(-2, SweatAdj + ClimateAdj));

    // ===== Step 9: Calculate daily water in ounces =====
    const DailyWater = W * SexCoef + WorkoutAdj + GoalAdj + AgeAdj + EnvCapped;

    // ===== Step 10: Safety clamp (prevents extreme outputs) =====
    const minWater = 0.35 * W;
    const maxWater = 0.65 * W;
    const DailyWaterFinal = Math.min(maxWater, Math.max(minWater, DailyWater));

    // ===== Step 10.5: Add 6 oz to all final amounts =====
    const DailyWaterAdjusted = DailyWaterFinal + 6;

    // Round to whole oz
    const roundedOz = Math.round(DailyWaterAdjusted);

    // ✅ ALWAYS return in OZ - let the UI handle display conversion
    return {
      valueInOz: roundedOz, // Always store the oz value
      waterUnit: waterUnit, // Store user's preference for display
    };
  };

  const handleSelectGenerated = () => {
    setSelectedOption("generated");
    onChange({
      option: "generated",
      goal: calculatedGoal.valueInOz, // Always save oz value
      unit: "oz", // Always save as oz
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSelectCustom = () => {
    setSelectedOption("custom");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    if (text && !isNaN(text)) {
      const numValue = parseFloat(text);
      // If user's preference is liters, convert their input to oz for storage
      const ozValue =
        waterUnit === "liters"
          ? numValue * 33.8140227018 // Use precise conversion constant
          : numValue;

      onChange({
        option: "custom",
        goal: parseFloat(ozValue.toFixed(2)), // Keep 2 decimal places, don't round to whole number
        unit: "oz", // Always save as oz
      });
    }
  };

  // Helper to get display value (converts oz to user's preferred unit for display only)
  const getDisplayValue = () => {
    if (!calculatedGoal) return "";

    if (waterUnit === "liters") {
      const liters = ozToLiters(calculatedGoal.valueInOz);
      return liters.toFixed(1);
    } else {
      return calculatedGoal.valueInOz.toString();
    }
  };

  const getDisplayUnit = () => {
    return waterUnit === "liters" ? "L" : "oz";
  };

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value * 100}%`,
    };
  });

  if (calculating) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Animated.Text
          entering={ZoomIn.duration(600)}
          style={{ fontSize: 64, marginBottom: 32 }}
        >
          💧
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(200)}
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#1F2937",
            marginBottom: 48,
            textAlign: "center",
          }}
        >
          Calculating your perfect hydration goal...
        </Animated.Text>

        {/* Progress Bar */}
        <View
          style={{
            width: "100%",
            height: 8,
            backgroundColor: "#E5E7EB",
            borderRadius: 4,
            marginBottom: 32,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[
              progressBarStyle,
              {
                height: "100%",
                backgroundColor: "#0EA5E9",
                borderRadius: 4,
              },
            ]}
          />
        </View>

        {/* Current Step */}
        <View style={{ alignItems: "center", minHeight: 80 }}>
          {steps.map((step, index) =>
            index === currentStep ? (
              <Animated.View
                key={index}
                entering={FadeInDown.duration(400)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 32 }}>{step.icon}</Text>
                <Text
                  style={{ fontSize: 18, color: "#64748B", fontWeight: "600" }}
                >
                  {step.label}
                </Text>
              </Animated.View>
            ) : null,
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingTop: 10,
        paddingHorizontal: 24,
        paddingBottom: 140,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={ZoomIn.duration(600)}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#10B981",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
            alignSelf: "center",
            shadowColor: "#10B981",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}
        >
          <Text style={{ fontSize: 56 }}>✓</Text>
        </View>
      </Animated.View>

      <Animated.Text
        entering={FadeIn.delay(200)}
        style={{
          fontSize: 32,
          fontWeight: "700",
          color: "#1F2937",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Your Personalized Goal
      </Animated.Text>

      <Animated.View
        entering={ZoomIn.delay(400).duration(800)}
        style={{
          backgroundColor: "#F0F9FF",
          borderRadius: 24,
          padding: 32,
          alignItems: "center",
          marginBottom: 20,
          borderWidth: 2,
          borderColor: "#0EA5E9",
        }}
      >
        <Text
          style={{
            fontSize: 64,
            fontWeight: "800",
            color: "#0EA5E9",
            marginBottom: 8,
          }}
        >
          {getDisplayValue()}
          <Text style={{ fontSize: 32 }}> {getDisplayUnit()}</Text>
        </Text>
        <Text style={{ fontSize: 16, color: "#64748B" }}>per day</Text>
      </Animated.View>

      <Animated.Text
        entering={FadeIn.delay(600)}
        style={{
          fontSize: 18,
          color: "#64748B",
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 26,
        }}
      >
        Based on your age, weight, activity level, gender, and environment, we
        recommend this daily goal.
      </Animated.Text>

      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#1F2937",
          marginBottom: 16,
        }}
      >
        Choose your goal:
      </Text>

      {/* Generated Goal Option */}
      <Animated.View entering={FadeInDown.delay(700).duration(600)}>
        <Pressable
          onPress={handleSelectGenerated}
          style={{
            backgroundColor:
              selectedOption === "generated" ? "#0EA5E9" : "#FFFFFF",
            borderRadius: 16,
            padding: 20,
            borderWidth: 2,
            borderColor: selectedOption === "generated" ? "#0EA5E9" : "#E2E8F0",
            marginBottom: 16,
            shadowColor: selectedOption === "generated" ? "#0EA5E9" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: selectedOption === "generated" ? 0.2 : 0.05,
            shadowRadius: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 32 }}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: selectedOption === "generated" ? "#FFFFFF" : "#1F2937",
                  marginBottom: 4,
                }}
              >
                Use recommended goal
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: selectedOption === "generated" ? "#E0F2FE" : "#64748B",
                }}
              >
                {getDisplayValue()} {getDisplayUnit()} daily
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Custom Goal Option */}
      <Animated.View entering={FadeInDown.delay(800).duration(600)}>
        <Pressable
          onPress={handleSelectCustom}
          style={{
            backgroundColor:
              selectedOption === "custom" ? "#0EA5E9" : "#FFFFFF",
            borderRadius: 16,
            padding: 20,
            borderWidth: 2,
            borderColor: selectedOption === "custom" ? "#0EA5E9" : "#E2E8F0",
            shadowColor: selectedOption === "custom" ? "#0EA5E9" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: selectedOption === "custom" ? 0.2 : 0.05,
            shadowRadius: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 32 }}>✏️</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: selectedOption === "custom" ? "#FFFFFF" : "#1F2937",
                  marginBottom: 8,
                }}
              >
                Set custom goal
              </Text>
              {selectedOption === "custom" && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <TextInput
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor="#94A3B8"
                    style={{
                      flex: 1,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1F2937",
                    }}
                  />
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", color: "#FFF" }}
                  >
                    {getDisplayUnit()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
