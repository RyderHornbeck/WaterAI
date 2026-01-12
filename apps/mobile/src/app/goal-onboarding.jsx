import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ProgressHeader } from "@/components/Onboarding/ProgressHeader";
import { QuestionContent } from "@/components/Onboarding/QuestionContent";
import { NextButton } from "@/components/Onboarding/NextButton";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

// Goal-only questions (subset of full onboarding)
const GOAL_QUESTIONS = [
  // Q1: Gender
  {
    id: 1,
    question: "What's your gender?",
    subtitle: "This helps us calculate your ideal daily goal",
    options: [
      { label: "👨 Male", value: "male", emoji: "👨" },
      { label: "👩 Female", value: "female", emoji: "👩" },
      { label: "⚧️ Non-binary", value: "nonbinary", emoji: "⚧️" },
      { label: "🤍 Prefer not to say", value: "other", emoji: "🤍" },
    ],
    key: "gender",
    type: "choice",
  },

  // Q2: Age
  {
    id: 2,
    question: "How old are you?",
    subtitle: "Age affects your hydration needs",
    minAge: 13,
    maxAge: 100,
    defaultAge: 25,
    key: "age",
    type: "number-roller",
  },

  // Q3: Height & Weight
  {
    id: 3,
    question: "What's your height and weight?",
    subtitle: "We'll calculate your personalized goal",
    key: "heightWeight",
    type: "height-weight",
    defaults: {
      heightFeet: 5,
      heightInches: 8,
      heightCm: 173,
      weightLbs: 150,
      weightKg: 68,
    },
    ranges: {
      heightFeet: { min: 4, max: 7 },
      heightInches: { min: 0, max: 11 },
      heightCm: { min: 120, max: 220 },
      weightLbs: { min: 80, max: 400 },
      weightKg: { min: 35, max: 180 },
    },
  },

  // Q4: Climate
  {
    id: 4,
    question: "What's your climate like?",
    subtitle: "Temperature affects how much water you need",
    options: [
      { label: "🧊 Cold climate", value: "cold", emoji: "🧊" },
      { label: "🌤️ Temperate climate", value: "temperate", emoji: "🌤️" },
      { label: "🌡️ Hot climate", value: "hot", emoji: "🌡️" },
    ],
    key: "climate",
    type: "choice",
  },

  // Q5: Workouts Per Week
  {
    id: 5,
    question: "How often do you work out each week?",
    subtitle: "Active people need more water",
    options: [
      { label: "🛋️ 0-1 times", value: "0", emoji: "🛋️" },
      { label: "🚶 2-3 times", value: "2", emoji: "🚶" },
      { label: "🏃 4-5 times", value: "5", emoji: "🏃" },
      { label: "💪 6+ times", value: "7", emoji: "💪" },
    ],
    key: "workoutsPerWeek",
    type: "choice",
  },

  // Q6: Sweat Level
  {
    id: 6,
    question: "How much do you sweat when you workout?",
    subtitle: "This helps us personalize your hydration needs",
    options: [
      { label: "💧 Sweat lightly", value: "low", emoji: "💧" },
      { label: "💦 Sweat moderately", value: "normal", emoji: "💦" },
      { label: "🌊 Sweat heavily", value: "high", emoji: "🌊" },
    ],
    key: "sweatLevel",
    type: "choice",
  },

  // Q7: Water Goal
  {
    id: 7,
    question: "What is your goal with tracking water?",
    subtitle: "We'll optimize your hydration plan",
    options: [
      { label: "🧘 Stay healthy / Stay fit", value: "healthy", emoji: "🧘" },
      { label: "⚖️ Lose weight", value: "lose", emoji: "⚖️" },
      { label: "💪 Gain weight / muscle", value: "gain", emoji: "💪" },
    ],
    key: "waterGoal",
    type: "choice",
  },

  // Q8: Goal Calculation
  {
    id: 8,
    question: "Your New Daily Hydration Goal",
    subtitle: "Calculated based on your updated information",
    key: "goalCalculation",
    type: "goal-calculation",
  },
];

export default function GoalOnboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fetchSettings, timezone } = useUserSettingsStore();

  const currentQuestion = GOAL_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === GOAL_QUESTIONS.length - 1;
  const progress = ((currentQuestionIndex + 1) / GOAL_QUESTIONS.length) * 100;

  const handleAnswer = (value) => {
    setAnswers({
      ...answers,
      [currentQuestion.key]: value,
    });
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Validate that a goal was selected
      const calculatedGoal = answers.goalCalculation?.goal;

      if (!calculatedGoal) {
        Alert.alert(
          "No Goal Selected",
          "Please select either the recommended goal or enter a custom goal before continuing.",
        );
        return;
      }

      // Submit the new goal
      setIsSubmitting(true);
      try {
        // Call the update-goal API
        const response = await fetchWithAuth("/api/update-goal", {
          method: "POST",
          body: JSON.stringify({
            dailyGoal: calculatedGoal,
            timezone: timezone || "America/New_York",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update goal");
        }

        const result = await response.json();

        // ✅ AGGRESSIVE CACHE INVALIDATION - Force complete refresh
        // Remove ALL cached data related to goals and water history
        await queryClient.resetQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === "weeklyGoal" ||
              key === "waterHistory" ||
              key === "todayWater" ||
              key === "dayDetails"
            );
          },
        });

        // Force immediate refetch of critical data
        await Promise.all([
          queryClient.refetchQueries({
            queryKey: ["waterHistory"],
            type: "active",
          }),
          queryClient.refetchQueries({
            queryKey: ["weeklyGoal"],
            type: "active",
          }),
        ]);

        // Refresh settings
        await fetchSettings();

        // Show success message
        Alert.alert(
          "Goal Updated! 🎯",
          result.message || "Your new daily goal has been set!",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        );
      } catch (error) {
        console.error("Error updating goal:", error);
        Alert.alert("Error", "Failed to update your goal. Please try again.", [
          { text: "OK" },
        ]);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleClose = () => {
    Alert.alert("Cancel Goal Update?", "Your progress will not be saved.", [
      {
        text: "Continue Editing",
        style: "cancel",
      },
      {
        text: "Cancel",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  };

  const currentAnswer = answers[currentQuestion.key];
  const canProceed =
    currentQuestion.type === "stat" ||
    currentQuestion.type === "number-roller" ||
    currentQuestion.type === "height-weight" ||
    currentQuestion.type === "goal-calculation"
      ? true
      : currentAnswer !== undefined && currentAnswer !== "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F9FF" }}>
      <StatusBar style="dark" />

      {/* Custom Header with Close Button */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: 12,
        }}
      >
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
              color: "#1E293B",
            }}
          >
            Update Your Goal
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#E2E8F0",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View
          style={{
            height: 6,
            backgroundColor: "#E0E7FF",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "#0EA5E9",
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      <QuestionContent
        question={currentQuestion}
        currentAnswer={currentAnswer}
        onAnswer={handleAnswer}
        bottles={[]} // No bottles in goal-only flow
        onPickImage={() => {}} // Not used
        onUpdateBottleOunces={() => {}} // Not used
        onRemoveBottle={() => {}} // Not used
        slideAnim={{ interpolate: () => 0 }} // No animation
        fadeAnim={{ interpolate: () => 1 }} // No animation
        allAnswers={answers}
      />

      {/* Next/Submit Button */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 20,
          paddingTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed || isSubmitting}
          style={{
            backgroundColor:
              !canProceed || isSubmitting ? "#CBD5E1" : "#0EA5E9",
            paddingVertical: 18,
            borderRadius: 16,
            alignItems: "center",
            shadowColor: !canProceed || isSubmitting ? "#000" : "#0EA5E9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: !canProceed || isSubmitting ? 0.1 : 0.3,
            shadowRadius: 8,
            elevation: !canProceed || isSubmitting ? 2 : 4,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              {isLastQuestion ? "Update Goal" : "Next"}
            </Text>
          )}
        </TouchableOpacity>

        {currentQuestionIndex > 0 && (
          <TouchableOpacity
            onPress={handleBack}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#64748B",
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
