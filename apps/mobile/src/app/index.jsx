import { useEffect, useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  Animated,
  Dimensions,
} from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/utils/auth/useAuth";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import useUserSettingsStore from "@/stores/useUserSettingsStore";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Droplet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady, auth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const userId = auth?.user?.id;

  // Animations
  const dropletScale = useRef(new Animated.Value(0)).current;
  const dropletOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const rippleScale1 = useRef(new Animated.Value(0)).current;
  const rippleScale2 = useRef(new Animated.Value(0)).current;
  const rippleScale3 = useRef(new Animated.Value(0)).current;

  // Use global settings store
  const { onboardingCompleted, fetchSettings } = useUserSettingsStore();

  const timestamp = () => new Date().toISOString();

  const screenWidth = Dimensions.get("window").width;

  // Start animations on mount
  useEffect(() => {
    // Start droplet entrance animation
    Animated.parallel([
      Animated.spring(dropletScale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(dropletOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Start ripple animations
    const createRipple = (rippleAnim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(rippleAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(rippleAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    createRipple(rippleScale1, 0);
    createRipple(rippleScale2, 600);
    createRipple(rippleScale3, 1200);
  }, []);

  useEffect(() => {
    console.log(`[INDEX ${timestamp()}] State changed`, {
      isReady,
      isAuthenticated,
      userId,
      loading,
      checked,
      onboardingCompleted,
    });

    if (isReady && isAuthenticated && userId) {
      console.log(
        `[INDEX ${timestamp()}] User authenticated, checking onboarding for user ${userId}`,
      );
      setLoadingStage("Loading your profile...");
      setProgress(30);

      checkOnboardingStatus();
    } else if (isReady && !isAuthenticated) {
      console.log(
        `[INDEX ${timestamp()}] User not authenticated, redirecting to welcome`,
      );
      setLoadingStage("Ready!");
      setProgress(100);
      setLoading(false);
      setChecked(true);
    }
  }, [isReady, isAuthenticated, userId]);

  const checkOnboardingStatus = async () => {
    try {
      const currentUserId = auth?.user?.id;
      console.log(
        `[INDEX ${timestamp()}] Fetching onboarding status for user ${currentUserId}`,
      );

      setLoadingStage("Loading your settings...");
      setProgress(50);

      // Use global store to fetch settings (will use cache if fresh)
      await fetchSettings();

      console.log(`[INDEX ${timestamp()}] Onboarding status received`, {
        userId: currentUserId,
        onboardingCompleted,
      });

      // Double check we're still authenticated as the same user
      if (auth?.user?.id !== currentUserId) {
        console.warn(
          `[INDEX ${timestamp()}] User changed during fetch, ignoring stale data`,
          {
            fetchedFor: currentUserId,
            currentUser: auth?.user?.id,
          },
        );
        return;
      }

      setLoadingStage("Preparing your data...");
      setProgress(70);

      // If onboarding not complete, check for saved quiz data
      if (!onboardingCompleted) {
        console.log(
          `[INDEX ${timestamp()}] Checking for saved onboarding data`,
        );
        const savedAnswers = await AsyncStorage.getItem("onboarding_answers");
        const savedBottles = await AsyncStorage.getItem("onboarding_bottles");

        if (savedAnswers && savedBottles) {
          console.log(
            `[INDEX ${timestamp()}] Found saved onboarding data, submitting...`,
          );
          setLoadingStage("Completing setup...");
          setProgress(85);

          const answers = JSON.parse(savedAnswers);
          const bottles = JSON.parse(savedBottles);

          // Submit the onboarding data
          await submitOnboarding(answers, bottles);

          // Clear the saved data
          await AsyncStorage.removeItem("onboarding_answers");
          await AsyncStorage.removeItem("onboarding_bottles");

          console.log(
            `[INDEX ${timestamp()}] Onboarding completed from saved data`,
          );
        }
      }

      setLoadingStage("Almost ready...");
      setProgress(95);

      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log(`[INDEX ${timestamp()}] Final state before redirect:`, {
        onboardingCompleted,
      });

      setLoadingStage("Ready!");
      setProgress(100);
    } catch (err) {
      console.error(`[INDEX ${timestamp()}] Error checking onboarding:`, err);
    } finally {
      // Small delay before fade out
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setLoading(false);
        setChecked(true);
      });

      console.log(`[INDEX ${timestamp()}] Onboarding check completed`);
    }
  };

  const submitOnboarding = async (answers, bottles) => {
    try {
      // ✅ Goal is ALWAYS in oz now (GoalCalculationQuestion handles all conversions)
      const dailyGoal = answers.goalCalculation?.goal
        ? Math.round(parseFloat(answers.goalCalculation.goal))
        : 64;

      console.log("💾 INDEX.JSX - Submitting onboarding with goal:", {
        dailyGoal,
        unit: "oz (database always stores in oz)",
        userPreference: answers.waterUnit,
      });

      // Auto-detect timezone from device (no permissions needed)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log("Auto-detected timezone:", timezone);

      // Save user settings
      const settingsResponse = await fetchWithAuth("/api/user-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: answers.gender,
          age: answers.age,
          heightWeight: answers.heightWeight,
          workoutsPerWeek: answers.workoutsPerWeek
            ? parseInt(answers.workoutsPerWeek, 10)
            : null,
          waterGoal: answers.waterGoal,
          waterUnit: answers.waterUnit,
          handSize: answers.handSize,
          sipSize: answers.sipSize,
          dailyGoal: dailyGoal,
          timezone,
        }),
      });

      if (!settingsResponse.ok) {
        throw new Error("Failed to save settings");
      }

      // Upload bottles
      for (const bottle of bottles) {
        const formData = new FormData();
        formData.append("image", {
          uri: bottle.uri,
          type: "image/jpeg",
          name: "bottle.jpg",
        });
        formData.append("ounces", bottle.ounces.toString());

        await fetchWithAuth("/api/upload-bottle", {
          method: "POST",
          body: formData,
        });
      }

      console.log("Onboarding data submitted successfully");
    } catch (error) {
      console.error("Error submitting onboarding:", error);
      throw error;
    }
  };

  if (!isReady || loading) {
    console.log(`[INDEX ${timestamp()}] Showing splash screen`, {
      isReady,
      loading,
    });
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <LinearGradient
          colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
          style={{ flex: 1 }}
        >
          <StatusBar style="light" />

          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            {/* Ripple effects */}
            {[rippleScale1, rippleScale2, rippleScale3].map((ripple, index) => (
              <Animated.View
                key={index}
                style={{
                  position: "absolute",
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  transform: [
                    {
                      scale: ripple.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 2.5],
                      }),
                    },
                  ],
                  opacity: ripple.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 0.3, 0],
                  }),
                }}
              />
            ))}

            {/* Main droplet icon */}
            <Animated.View
              style={{
                transform: [
                  { scale: Animated.multiply(dropletScale, pulseAnim) },
                ],
                opacity: dropletOpacity,
                marginBottom: 40,
              }}
            >
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Droplet size={64} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Animated.View>

            {/* App name */}
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: "#FFFFFF",
                marginBottom: 12,
                letterSpacing: 1,
              }}
            >
              Water AI
            </Text>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: 60,
              }}
            >
              Stay Hydrated, Stay Healthy
            </Text>

            {/* Loading indicator */}
            <View style={{ alignItems: "center", width: screenWidth * 0.7 }}>
              {/* Progress bar background */}
              <View
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  borderRadius: 2,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                {/* Progress bar fill */}
                <Animated.View
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 2,
                  }}
                />
              </View>

              {/* Loading text */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.95)",
                  textAlign: "center",
                }}
              >
                {loadingStage}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Not authenticated → go to welcome screen
  if (!isAuthenticated && checked) {
    console.log(`[INDEX ${timestamp()}] Redirecting to /welcome`);
    return <Redirect href="/welcome" />;
  }

  // Authenticated but onboarding not completed → go to onboarding
  if (isAuthenticated && !onboardingCompleted && checked) {
    console.log(
      `[INDEX ${timestamp()}] Redirecting to /onboarding for user ${userId}`,
    );
    return <Redirect href="/onboarding" />;
  }

  // Authenticated and onboarding complete → go directly to main app
  if (isAuthenticated && onboardingCompleted && checked) {
    console.log(
      `[INDEX ${timestamp()}] Redirecting to /(tabs) for user ${userId}`,
    );
    return <Redirect href="/(tabs)" />;
  }

  // Still checking - show splash
  console.log(`[INDEX ${timestamp()}] Still checking, showing splash screen`);
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <LinearGradient
        colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
        style={{ flex: 1 }}
      >
        <StatusBar style="light" />

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <Animated.View
            style={{
              transform: [
                { scale: Animated.multiply(dropletScale, pulseAnim) },
              ],
              opacity: dropletOpacity,
            }}
          >
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Droplet size={64} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
