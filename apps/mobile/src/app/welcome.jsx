import { View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Droplets, LogIn, UserPlus } from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady, auth } = useAuth();
  const router = useRouter();
  const userId = auth?.user?.id;

  const timestamp = () => new Date().toISOString();

  useEffect(() => {
    console.log(`[WELCOME ${timestamp()}] State changed`, {
      isReady,
      isAuthenticated,
      userId,
    });

    // When user becomes authenticated, redirect to index which will route appropriately
    if (isReady && isAuthenticated) {
      console.log(
        `[WELCOME ${timestamp()}] User authenticated (${userId}), redirecting to /`,
      );
      router.replace("/");
    }
  }, [isAuthenticated, isReady, router, userId]);

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

      {/* Header with Icon */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            width: 120,
            height: 120,
            backgroundColor: "#DBEAFE",
            borderRadius: 60,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            shadowColor: "#3B82F6",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Droplets color="#3B82F6" size={64} />
        </View>

        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Hydration Tracker
        </Text>

        <Text
          style={{
            fontSize: 18,
            color: "#64748B",
            textAlign: "center",
            marginBottom: 60,
            lineHeight: 26,
          }}
        >
          Track your daily water intake{"\n"}and stay hydrated
        </Text>

        {/* Create Account Button */}
        <TouchableOpacity
          onPress={() => router.push("/onboarding")}
          style={{
            backgroundColor: "#3B82F6",
            paddingVertical: 18,
            paddingHorizontal: 40,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            marginBottom: 16,
            shadowColor: "#3B82F6",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <UserPlus color="#fff" size={24} />
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "700",
              marginLeft: 12,
            }}
          >
            Create Account
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={() => router.push("/account/signin")}
          style={{
            backgroundColor: "#fff",
            paddingVertical: 18,
            paddingHorizontal: 40,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            borderWidth: 2,
            borderColor: "#3B82F6",
          }}
        >
          <LogIn color="#3B82F6" size={24} />
          <Text
            style={{
              color: "#3B82F6",
              fontSize: 18,
              fontWeight: "700",
              marginLeft: 12,
            }}
          >
            Login
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 14,
            color: "#94A3B8",
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Stay healthy, stay hydrated
        </Text>
      </View>
    </View>
  );
}
