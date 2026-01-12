import { useRef, useEffect } from "react";
import { Animated, Easing } from "react-native";

export function useBottleAnimation(todayTotal, dailyGoal) {
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  // Smooth fill animation with natural easing
  useEffect(() => {
    // Cap at 97.5% when goal is reached or exceeded
    const rawProgress = todayTotal / dailyGoal;
    const progress = rawProgress >= 1.0 ? 0.975 : Math.min(rawProgress, 0.975);

    Animated.spring(fillAnimation, {
      toValue: progress,
      useNativeDriver: false,
      tension: 45,
      friction: 9,
      overshootClamping: false,
    }).start();
  }, [todayTotal, dailyGoal, fillAnimation]);

  // Wave animations with smooth, continuous motion
  useEffect(() => {
    const createWaveAnimation = (wave, duration, delay = 0, range = 20) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(wave, {
            toValue: 1,
            duration: duration,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95), // Smooth sine-like easing
            useNativeDriver: true,
          }),
          Animated.timing(wave, {
            toValue: 0,
            duration: duration,
            easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    // Staggered waves with different speeds for natural water motion
    const wave1Animation = createWaveAnimation(wave1, 2200, 0);
    const wave2Animation = createWaveAnimation(wave2, 2700, 600);
    const wave3Animation = createWaveAnimation(wave3, 3200, 1200);

    wave1Animation.start();
    wave2Animation.start();
    wave3Animation.start();

    return () => {
      wave1Animation.stop();
      wave2Animation.stop();
      wave3Animation.stop();
    };
  }, [wave1, wave2, wave3]);

  // Wave movement interpolations - create flowing water effect
  const wave1X = wave1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-10, 25, -10],
  });

  const wave2X = wave2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [15, -20, 15],
  });

  const wave3X = wave3.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-5, 12, -5],
  });

  return {
    fillAnimation,
    wave1X,
    wave2X,
    wave3X,
  };
}
