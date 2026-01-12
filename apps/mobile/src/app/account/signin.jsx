import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Lock, Droplets } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/utils/auth/store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const emailPosition = useRef(new Animated.Value(0)).current;
  const passwordPosition = useRef(new Animated.Value(0)).current;

  const handleInputFocus = (positionAnim) => {
    const targetPosition = SCREEN_HEIGHT * 0.3;
    Animated.spring(positionAnim, {
      toValue: -targetPosition,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const handleInputBlur = (positionAnim) => {
    Animated.spring(positionAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const handleSignIn = async () => {
    // Prevent double-submission
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // Input validation
      if (!trimmedEmail || !trimmedPassword) {
        throw new Error("Email and password are required");
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      // Password length validation
      if (trimmedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      console.log("=== SIGNIN DEBUG START ===");
      console.log("Starting signin process...");

      const baseUrl =
        process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
        process.env.EXPO_PUBLIC_BASE_URL;

      if (!baseUrl) {
        console.error("❌ No base URL found in environment variables!");
        throw new Error(
          "Backend URL is not configured. Please restart the app.",
        );
      }

      const apiUrl = `${baseUrl}/api/mobile-auth/signin`;
      console.log("Environment check:");
      console.log("  - Using base URL:", baseUrl);
      console.log("  - Full API URL:", apiUrl);

      // Add timeout to prevent infinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000);

      // Call the signin API with trimmed inputs
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response received:");
      console.log("  - Status:", response.status);
      console.log("  - Status Text:", response.statusText);
      console.log("  - OK:", response.ok);

      // Get the raw response text first
      const responseText = await response.text();
      console.log("Raw response text length:", responseText.length);
      console.log(
        "Raw response preview (first 500 chars):",
        responseText.substring(0, 500),
      );

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Successfully parsed JSON:", data);
      } catch (parseError) {
        console.error("❌ JSON PARSE ERROR:", parseError.message);

        // Show the FULL raw response in the error UI
        throw new Error(
          `[HTTP ${response.status}] JSON Parse Error: ${parseError.message}\n\nRaw Response: ${responseText.substring(0, 300)}`,
        );
      }

      if (!response.ok) {
        console.log("Response not OK, error:", data.error);

        // Build comprehensive error message from backend
        let errorMessage = `[HTTP ${response.status}] ${data.error || response.statusText}`;

        // If backend sent errorDetails, format them nicely
        if (data.errorDetails) {
          errorMessage += "\n\n=== ERROR DETAILS ===";
          if (data.errorDetails.type)
            errorMessage += `\nType: ${data.errorDetails.type}`;
          if (data.errorDetails.code)
            errorMessage += `\nCode: ${data.errorDetails.code}`;
          if (data.errorDetails.detail)
            errorMessage += `\nDetail: ${data.errorDetails.detail}`;
          if (data.errorDetails.hint)
            errorMessage += `\nHint: ${data.errorDetails.hint}`;
          if (data.errorDetails.table)
            errorMessage += `\nTable: ${data.errorDetails.table}`;
          if (data.errorDetails.column)
            errorMessage += `\nColumn: ${data.errorDetails.column}`;
        } else {
          // Fallback: show full response
          errorMessage += `\n\nFull response:\n${JSON.stringify(data, null, 2)}`;
        }

        throw new Error(errorMessage);
      }

      console.log("Signin successful!");

      // Validate response data
      if (!data.jwt || !data.user || !data.user.id) {
        throw new Error(
          `Invalid server response - missing authentication data.\n\nReceived: ${JSON.stringify(data)}`,
        );
      }

      // Store JWT token using setAuth
      const authData = {
        jwt: data.jwt,
        user: data.user,
      };

      console.log("Calling setAuth...");
      await setAuth(authData);
      console.log("Authentication stored");

      // Clear any onboarding data
      await AsyncStorage.removeItem("onboarding_answers");
      await AsyncStorage.removeItem("onboarding_bottles");

      console.log("=== SIGNIN DEBUG END ===");

      // Navigate to loading screen to fetch all app data
      router.replace("/loading");
    } catch (err) {
      console.error("=== SIGNIN ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("=== SIGNIN ERROR END ===");

      // Show FULL error details in the UI
      let fullErrorMessage = err.message || "Sign in failed";

      // Add error type and stack for AbortError or network errors
      if (err.name === "AbortError") {
        fullErrorMessage = `[TIMEOUT] Request timed out after 15 seconds.\n\nError: ${err.name}\nMessage: ${err.message}`;
      } else if (
        err.message?.includes("Network request failed") ||
        err.message?.includes("fetch")
      ) {
        fullErrorMessage = `[NETWORK ERROR] Cannot connect to server.\n\nError: ${err.name}\nMessage: ${err.message}\n\nStack: ${err.stack?.substring(0, 200)}`;
      } else {
        // For all other errors, show the complete error with type
        fullErrorMessage = `[${err.name || "ERROR"}] ${err.message}\n\n${err.stack ? `Stack: ${err.stack.substring(0, 300)}` : ""}`;
      }

      setError(fullErrorMessage);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Header with Back Button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#fff",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{
          transform: [
            { translateY: Animated.add(emailPosition, passwordPosition) },
          ],
        }}
      >
        {/* Logo Section */}
        <View style={{ alignItems: "center", marginTop: 20, marginBottom: 40 }}>
          <View
            style={{
              width: 100,
              height: 100,
              backgroundColor: "#DBEAFE",
              borderRadius: 50,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Droplets color="#3B82F6" size={52} />
          </View>

          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Welcome Back
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            Sign in to continue tracking
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginTop: 20 }}>
          {/* Email Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              Email
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 2,
                borderColor: "#E2E8F0",
              }}
            >
              <Mail color="#94A3B8" size={20} />
              <TextInput
                ref={emailInputRef}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => handleInputFocus(emailPosition)}
                onBlur={() => handleInputBlur(emailPosition)}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E293B",
                  paddingVertical: 16,
                  paddingLeft: 12,
                }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              Password
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#fff",
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 2,
                borderColor: "#E2E8F0",
              }}
            >
              <Lock color="#94A3B8" size={20} />
              <TextInput
                ref={passwordInputRef}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoCapitalize="none"
                onFocus={() => handleInputFocus(passwordPosition)}
                onBlur={() => handleInputBlur(passwordPosition)}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E293B",
                  paddingVertical: 16,
                  paddingLeft: 12,
                }}
              />
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <ScrollView
              style={{
                backgroundColor: "#FEE2E2",
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                maxHeight: 200,
              }}
              nestedScrollEnabled={true}
            >
              <Text
                style={{
                  color: "#DC2626",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              >
                {error}
              </Text>
            </ScrollView>
          ) : null}

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            style={{
              backgroundColor: "#3B82F6",
              paddingVertical: 18,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Sign In
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
