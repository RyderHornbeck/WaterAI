import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, User, Droplets, ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthStore } from "@/utils/auth/store";
import useUser from "@/utils/auth/useUser";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { user } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const namePosition = useRef(new Animated.Value(0)).current;
  const emailPosition = useRef(new Animated.Value(0)).current;
  const passwordPosition = useRef(new Animated.Value(0)).current;

  // Pre-fill form with user's current info if they're already logged in
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      // Don't pre-fill password for security reasons, but we won't require it if user exists
    }
  }, [user]);

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

  const uploadBottleImage = async (bottle) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      bottle.uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
    );

    const response = await fetch(manipResult.uri);
    const blob = await response.blob();

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(",")[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const uploadResponse = await fetchWithAuth("/api/upload-bottle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: base64,
        mimeType: "image/jpeg",
      }),
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok || uploadData.error) {
      throw new Error(uploadData.error || "Upload failed");
    }

    return uploadData.url;
  };

  const saveOnboardingData = async () => {
    try {
      console.log("[ONBOARDING SAVE] Starting saveOnboardingData...");

      // Load onboarding data from AsyncStorage
      const answersJson = await AsyncStorage.getItem("onboarding_answers");
      const bottlesJson = await AsyncStorage.getItem("onboarding_bottles");

      console.log("[ONBOARDING SAVE] Loaded from AsyncStorage:", {
        hasAnswers: !!answersJson,
        hasBottles: !!bottlesJson,
        answersLength: answersJson?.length,
        bottlesLength: bottlesJson?.length,
      });

      if (!answersJson) {
        // No onboarding data, just go to loading screen
        console.log(
          "[ONBOARDING SAVE] No onboarding data found, skipping to loading screen",
        );
        router.replace("/loading");
        return;
      }

      const answers = JSON.parse(answersJson);
      const bottles = bottlesJson ? JSON.parse(bottlesJson) : [];

      console.log(
        "[ONBOARDING SAVE] Parsed answers:",
        JSON.stringify(answers, null, 2),
      );
      console.log("[ONBOARDING SAVE] Parsed bottles:", bottles);

      // Get the daily goal from goalCalculation answer
      const dailyGoal = answers.goalCalculation?.goal
        ? Math.round(parseFloat(answers.goalCalculation.goal))
        : 64;

      console.log("[ONBOARDING SAVE] Calculated daily goal:", dailyGoal);

      // Prepare data for API
      const userData = {
        gender: answers.gender,
        age: answers.age,
        heightWeight: answers.heightWeight,
        activity: answers.activity,
        waterUnit: answers.waterUnit,
        handSize: answers.handSize,
        sipSize: answers.sipSize,
        waterGoal: answers.waterGoal,
        dailyGoal: dailyGoal,
      };

      console.log(
        "[ONBOARDING SAVE] Saving user settings:",
        JSON.stringify(userData, null, 2),
      );

      // Save user settings
      const settingsResponse = await fetchWithAuth("/api/user-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      console.log(
        "[ONBOARDING SAVE] Settings response status:",
        settingsResponse.status,
      );

      const settingsData = await settingsResponse.json();
      console.log("[ONBOARDING SAVE] Settings save response:", settingsData);

      if (!settingsResponse.ok) {
        console.error(
          "[ONBOARDING SAVE] ❌ Failed to save settings:",
          settingsData.error,
        );
        throw new Error(settingsData.error || "Failed to save settings");
      }

      console.log("[ONBOARDING SAVE] ✓ Settings saved successfully");

      // Upload and save bottles if any
      if (bottles.length > 0) {
        const validBottles = bottles.filter(
          (b) => b.uri && b.ounces && parseFloat(b.ounces) > 0,
        );

        console.log(
          `[ONBOARDING SAVE] Found ${validBottles.length} valid bottles to upload out of ${bottles.length} total`,
        );

        if (validBottles.length > 0) {
          const uploadedBottles = [];

          for (const bottle of validBottles) {
            try {
              console.log(`[ONBOARDING SAVE] Uploading bottle ${bottle.id}...`);
              const uploadUrl = await uploadBottleImage(bottle);
              uploadedBottles.push({
                imageUrl: uploadUrl,
                ounces: parseFloat(bottle.ounces),
              });
              console.log(
                `[ONBOARDING SAVE] ✓ Bottle ${bottle.id} uploaded successfully`,
              );
            } catch (uploadError) {
              console.error(
                "[ONBOARDING SAVE] ❌ Upload error for bottle:",
                uploadError,
              );
            }
          }

          if (uploadedBottles.length > 0) {
            console.log(
              `[ONBOARDING SAVE] Saving ${uploadedBottles.length} bottles to database`,
            );
            const bottlesResponse = await fetchWithAuth("/api/user-bottles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bottles: uploadedBottles,
              }),
            });

            const bottlesData = await bottlesResponse.json();
            console.log(
              "[ONBOARDING SAVE] Bottles save response:",
              bottlesData,
            );
          }
        }
      } else {
        console.log("[ONBOARDING SAVE] No bottles to upload");
      }

      // Clear AsyncStorage
      await AsyncStorage.removeItem("onboarding_answers");
      await AsyncStorage.removeItem("onboarding_bottles");

      console.log("[ONBOARDING SAVE] ✓ AsyncStorage cleared");
      console.log(
        "[ONBOARDING SAVE] ✓ Onboarding data saved successfully, navigating to loading screen",
      );

      // Navigate to loading screen to fetch all app data
      router.replace("/loading");
    } catch (err) {
      console.error("[ONBOARDING SAVE] ❌ Error saving onboarding data:", err);
      console.error("[ONBOARDING SAVE] Error message:", err.message);
      console.error("[ONBOARDING SAVE] Error stack:", err.stack);
      Alert.alert(
        "Setup Complete",
        "Your account was created! You can complete your profile in settings.",
        [{ text: "OK", onPress: () => router.replace("/loading") }],
      );
    }
  };

  const handleSignUp = async () => {
    // Prevent double-submission
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Trim whitespace from inputs
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      // If user already exists (coming back from paywall), just proceed to paywall
      if (user && user.id) {
        console.log("User already exists, proceeding to paywall...");
        // Save onboarding data if it exists
        await saveOnboardingData();
        return;
      }

      // Input validation for new signups
      if (!trimmedName || !trimmedEmail || !trimmedPassword) {
        throw new Error("All fields are required");
      }

      // Name validation
      if (trimmedName.length < 2) {
        throw new Error("Name must be at least 2 characters");
      }

      if (trimmedName.length > 50) {
        throw new Error("Name must be less than 50 characters");
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      // Password strength validation
      if (trimmedPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (trimmedPassword.length > 128) {
        throw new Error("Password must be less than 128 characters");
      }

      console.log("=== SIGNUP DEBUG START ===");
      console.log("Starting signup process...");

      // CRITICAL FIX: In Expo, relative URLs don't work for API calls
      // We need to use an absolute URL with the base URL prepended
      // This matches the logic in fetchWithAuth.js
      const baseUrl =
        process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
        process.env.EXPO_PUBLIC_BASE_URL;

      if (!baseUrl) {
        console.error("❌ No base URL found in environment variables!");
        throw new Error(
          "Backend URL is not configured. Please restart the app.",
        );
      }

      const apiUrl = `${baseUrl}/api/mobile-auth/signup`;
      console.log("Environment check:");
      console.log(
        "  - EXPO_PUBLIC_PROXY_BASE_URL:",
        process.env.EXPO_PUBLIC_PROXY_BASE_URL,
      );
      console.log(
        "  - EXPO_PUBLIC_BASE_URL:",
        process.env.EXPO_PUBLIC_BASE_URL,
      );
      console.log("  - Using base URL:", baseUrl);
      console.log("  - Full API URL:", apiUrl);
      console.log("Request body:", {
        email: trimmedEmail,
        name: trimmedName,
        password: "***",
      });

      // Add timeout to prevent infinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error("❌ Request timed out after 15 seconds");
      }, 15000);

      // Call the signup API with trimmed inputs
      console.log("Calling fetch...");
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          name: trimmedName,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Response received:");
      console.log("  - Status:", response.status);
      console.log("  - Status Text:", response.statusText);
      console.log("  - OK:", response.ok);
      console.log(
        "  - Headers:",
        JSON.stringify([...response.headers.entries()]),
      );

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
        console.error("❌ JSON PARSE ERROR:");
        console.error("  - Error:", parseError.message);
        console.error("  - Full response text:", responseText);

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

      console.log("Signup successful!");
      console.log(
        "JWT received:",
        data.jwt ? `${data.jwt.substring(0, 20)}...` : "NO JWT",
      );
      console.log("User data:", data.user);

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

      console.log("Calling setAuth with:", {
        hasJWT: !!authData.jwt,
        hasUser: !!authData.user,
        userId: authData.user?.id,
      });

      // IMPORTANT: await setAuth to ensure JWT is saved
      await setAuth(authData);
      console.log("Authentication stored via setAuth");

      // Verify auth state is actually set by polling the store
      let authVerified = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!authVerified && attempts < maxAttempts) {
        const currentState = useAuthStore.getState();
        const hasJWT = !!currentState.auth?.jwt;

        console.log(`Auth verification attempt ${attempts + 1}:`, {
          hasAuth: !!currentState.auth,
          hasJWT,
          jwtLength: currentState.auth?.jwt?.length,
          userId: currentState.auth?.user?.id,
        });

        if (hasJWT && currentState.auth.jwt === data.jwt) {
          authVerified = true;
          console.log("✓ Auth state verified in store");
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      if (!authVerified) {
        console.error("⚠️ Warning: Auth state not verified after max attempts");
        // Continue anyway, but log the warning
      }

      console.log("=== SIGNUP DEBUG END ===");

      // After successful signup and auth verification, save onboarding data
      await saveOnboardingData();
    } catch (err) {
      console.error("=== SIGNUP ERROR ===");
      console.error("Error type:", err.constructor.name);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      console.error("=== SIGNUP ERROR END ===");

      // Show FULL error details in the UI
      let fullErrorMessage = err.message || "Sign up failed";

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
          onPress={() => router.push("/onboarding")}
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
            {
              translateY: Animated.add(
                Animated.add(namePosition, emailPosition),
                passwordPosition,
              ),
            },
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
            Create Account
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            Start your hydration journey
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginTop: 20 }}>
          {/* Name Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#475569",
                marginBottom: 8,
              }}
            >
              Name
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
              <User color="#94A3B8" size={20} />
              <TextInput
                ref={nameInputRef}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoComplete="name"
                onFocus={() => handleInputFocus(namePosition)}
                onBlur={() => handleInputBlur(namePosition)}
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

          {/* Error Message - UPDATED TO MATCH SIGNIN */}
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

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
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
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
