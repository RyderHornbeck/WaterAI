import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Droplets, RefreshCw, AlertCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useInitialDataLoad } from "../hooks/useInitialDataLoad";

export default function Loading() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loading, error, data, retry } = useInitialDataLoad();
  const hasNavigated = useRef(false);

  // Animate the water droplet
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Pulse animation for the droplet
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Navigate to main app when data is loaded
  useEffect(() => {
    if (!loading && !error && data && !hasNavigated.current) {
      hasNavigated.current = true;
      console.log(
        "✅ Data loaded, navigating to index for subscription check...",
      );

      // Small delay to ensure smooth transition
      setTimeout(() => {
        // Changed from /(tabs) to / so index.jsx can check subscription
        router.replace("/");
      }, 500);
    }
  }, [loading, error, data]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F0F9FF",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 20,
        }}
      >
        <StatusBar style="dark" />

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Error Icon */}
          <View
            style={{
              width: 100,
              height: 100,
              backgroundColor: "#FEE2E2",
              borderRadius: 50,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <AlertCircle color="#DC2626" size={52} />
          </View>

          {/* Error Message */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#1E293B",
                textAlign: "center",
              }}
            >
              Oops! Something went wrong
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: "#64748B",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {error}
            </Text>
          </View>

          {/* Retry Button */}
          <TouchableOpacity
            onPress={retry}
            style={{
              backgroundColor: "#3B82F6",
              paddingVertical: 16,
              paddingHorizontal: 32,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
              marginTop: 16,
            }}
          >
            <RefreshCw color="#fff" size={20} />
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F0F9FF",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="dark" />

      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* Animated Water Droplet */}
        <Animated.View
          style={[
            {
              width: 120,
              height: 120,
              backgroundColor: "#DBEAFE",
              borderRadius: 60,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            },
            animatedStyle,
          ]}
        >
          <Droplets color="#3B82F6" size={64} />
        </Animated.View>

        {/* Loading Text */}
        <View style={{ alignItems: "center", gap: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#1E293B",
              textAlign: "center",
            }}
          >
            Getting ready...
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            Loading your hydration data
          </Text>
        </View>

        {/* Activity Indicator */}
        <ActivityIndicator size="large" color="#3B82F6" />

        {/* Loading Steps - optional visual feedback */}
        <View style={{ gap: 12, marginTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#3B82F6",
              }}
            />
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Loading your profile
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#3B82F6",
              }}
            />
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Loading today's progress
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#3B82F6",
              }}
            />
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Loading your history
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
