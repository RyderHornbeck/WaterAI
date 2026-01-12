import { useState, useRef } from "react";
import { Animated, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function useOnboardingNavigation(totalQuestions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToNext = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const animateToPrevious = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      slideAnim.setValue(-SCREEN_WIDTH);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = (callback) => {
    if (currentQuestionIndex === totalQuestions - 1) {
      callback();
    } else {
      animateToNext();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      animateToPrevious();
    }
  };

  const progress = (currentQuestionIndex + 1) / totalQuestions;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return {
    currentQuestionIndex,
    slideAnim,
    fadeAnim,
    handleNext,
    handleBack,
    progress,
    isLastQuestion,
  };
}
