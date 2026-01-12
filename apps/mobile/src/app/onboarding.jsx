import { useState } from "react";
import { View, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomCamera } from "@/components/CustomCamera/CustomCamera";
import { QUESTIONS } from "@/utils/onboarding/questions";
import { useOnboardingNavigation } from "@/hooks/useOnboardingNavigation";
import { useBottleManagement } from "@/hooks/useBottleManagement";
import { ProgressHeader } from "@/components/Onboarding/ProgressHeader";
import { QuestionContent } from "@/components/Onboarding/QuestionContent";
import { NextButton } from "@/components/Onboarding/NextButton";
import { ImageSourceModal } from "@/components/Onboarding/ImageSourceModal";

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState({});
  const router = useRouter();

  const {
    currentQuestionIndex,
    slideAnim,
    fadeAnim,
    handleNext: navigationHandleNext,
    handleBack,
    progress,
    isLastQuestion,
  } = useOnboardingNavigation(QUESTIONS.length);

  const {
    bottles,
    showCustomCamera,
    showImageSourceModal,
    setShowImageSourceModal,
    pickImage,
    handleUseCamera,
    handleUseCameraRoll,
    handleCameraCapture,
    handleCameraClose,
    updateBottleOunces,
    removeBottle,
  } = useBottleManagement();

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  const handleSignIn = () => {
    // Navigate directly to the mobile sign in page
    router.push("/account/signin");
  };

  const handleAnswer = (value) => {
    // Handle welcome screen actions
    if (currentQuestion.type === "welcome") {
      if (value === "signin") {
        // Navigate to sign in
        handleSignIn();
        return;
      } else if (value === "start") {
        // Continue to next question
        navigationHandleNext();
        return;
      }
    }

    setAnswers({
      ...answers,
      [currentQuestion.key]: value,
    });
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      // Save quiz data to AsyncStorage before redirecting to signup
      // Don't set isSubmitting - just navigate
      try {
        await AsyncStorage.setItem(
          "onboarding_answers",
          JSON.stringify(answers),
        );
        await AsyncStorage.setItem(
          "onboarding_bottles",
          JSON.stringify(bottles),
        );
        // After saving, navigate to signup page
        router.push("/account/signup");
      } catch (error) {
        console.error("Error saving onboarding data:", error);
      }
    } else {
      navigationHandleNext();
    }
  };

  const currentAnswer = answers[currentQuestion.key];
  const canProceed =
    currentQuestion.type === "bottles" ||
    currentQuestion.type === "welcome" ||
    currentQuestion.type === "stat" ||
    currentQuestion.type === "number-roller" ||
    currentQuestion.type === "height-weight" ||
    currentQuestion.type === "water-ai-explainer" ||
    currentQuestion.type === "ui-tutorial"
      ? true
      : currentQuestion.type === "goal-calculation"
        ? currentAnswer?.option !== undefined
        : currentAnswer !== undefined && currentAnswer !== "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F9FF" }}>
      <StatusBar style="dark" />

      <ProgressHeader
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={QUESTIONS.length}
        progress={progress}
        onBack={handleBack}
        insets={insets}
      />

      <QuestionContent
        question={currentQuestion}
        currentAnswer={currentAnswer}
        onAnswer={handleAnswer}
        bottles={bottles}
        onPickImage={pickImage}
        onUpdateBottleOunces={updateBottleOunces}
        onRemoveBottle={removeBottle}
        slideAnim={slideAnim}
        fadeAnim={fadeAnim}
        allAnswers={answers}
      />

      <NextButton
        onNext={handleNext}
        canProceed={canProceed}
        isSubmitting={false}
        isLastQuestion={isLastQuestion}
        questionType={currentQuestion.type}
        bottlesCount={bottles.length}
        insets={insets}
        onSignIn={handleSignIn}
      />

      <ImageSourceModal
        visible={showImageSourceModal}
        onUseCamera={handleUseCamera}
        onUseCameraRoll={handleUseCameraRoll}
        onClose={() => setShowImageSourceModal(false)}
      />

      <Modal
        visible={showCustomCamera}
        animationType="slide"
        onRequestClose={handleCameraClose}
      >
        <CustomCamera
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      </Modal>
    </View>
  );
}
