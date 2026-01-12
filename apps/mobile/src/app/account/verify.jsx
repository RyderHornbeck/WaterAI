import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Check } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthStore } from "@/utils/auth/store";

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email, name, password } = useLocalSearchParams();
  const { setAuth } = useAuthStore();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef([]);

  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleCodeChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (index === 5 && value && newCode.every((digit) => digit)) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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

      const answersJson = await AsyncStorage.getItem("onboarding_answers");
      const bottlesJson = await AsyncStorage.getItem("onboarding_bottles");

      if (!answersJson) {
        console.log(
          "[ONBOARDING SAVE] No onboarding data found, skipping to loading screen",
        );
        router.replace("/loading");
        return;
      }

      const answers = JSON.parse(answersJson);
      const bottles = bottlesJson ? JSON.parse(bottlesJson) : [];

      const dailyGoal = answers.goalCalculation?.goal
        ? Math.round(parseFloat(answers.goalCalculation.goal))
        : 64;

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

      const settingsResponse = await fetchWithAuth("/api/user-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const settingsData = await settingsResponse.json();

      if (!settingsResponse.ok) {
        console.error(
          "[ONBOARDING SAVE] ❌ Failed to save settings:",
          settingsData.error,
        );
        throw new Error(settingsData.error || "Failed to save settings");
      }

      if (bottles.length > 0) {
        const validBottles = bottles.filter(
          (b) => b.uri && b.ounces && parseFloat(b.ounces) > 0,
        );

        if (validBottles.length > 0) {
          const uploadedBottles = [];

          for (const bottle of validBottles) {
            try {
              const uploadUrl = await uploadBottleImage(bottle);
              uploadedBottles.push({
                imageUrl: uploadUrl,
                ounces: parseFloat(bottle.ounces),
              });
            } catch (uploadError) {
              console.error(
                "[ONBOARDING SAVE] ❌ Upload error for bottle:",
                uploadError,
              );
            }
          }

          if (uploadedBottles.length > 0) {
            await fetchWithAuth("/api/user-bottles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bottles: uploadedBottles,
              }),
            });
          }
        }
      }

      await AsyncStorage.removeItem("onboarding_answers");
      await AsyncStorage.removeItem("onboarding_bottles");

      router.replace("/loading");
    } catch (err) {
      console.error("[ONBOARDING SAVE] ❌ Error saving onboarding data:", err);
      Alert.alert(
        "Setup Complete",
        "Your account was created! You can complete your profile in settings.",
        [{ text: "OK", onPress: () => router.replace("/loading") }],
      );
    }
  };

  const handleVerify = async (codeToVerify = code.join("")) => {
    if (codeToVerify.length !== 6) {
      Alert.alert("Error", "Please enter all 6 digits");
      return;
    }

    setVerifying(true);

    try {
      // Step 1: Verify the code
      const verifyResponse = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          code: codeToVerify,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Verification failed");
      }

      console.log("✅ Code verified, creating account...");

      // Step 2: Create the account
      const baseUrl =
        process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
        process.env.EXPO_PUBLIC_BASE_URL;

      if (!baseUrl) {
        throw new Error(
          "Backend URL is not configured. Please restart the app.",
        );
      }

      const signupResponse = await fetch(`${baseUrl}/api/mobile-auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
          name: name,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupData.error || "Failed to create account");
      }

      if (!signupData.jwt || !signupData.user || !signupData.user.id) {
        throw new Error(
          "Invalid server response - missing authentication data",
        );
      }

      // Step 3: Store JWT token
      await setAuth({
        jwt: signupData.jwt,
        user: signupData.user,
      });

      console.log("✅ Account created successfully");

      // Step 4: Save onboarding data and proceed
      await saveOnboardingData();
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert("Verification Failed", error.message);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      Alert.alert(
        "Success",
        "A new verification code has been sent to your email",
      );
      setCanResend(false);
      setCountdown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error("Resend error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
        style={{ flex: 1 }}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            justifyContent: "center",
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              justifyContent: "center",
              alignItems: "center",
              alignSelf: "center",
              marginBottom: 24,
            }}
          >
            <Mail size={40} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#FFFFFF",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Check Your Email
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.9)",
              textAlign: "center",
              marginBottom: 40,
              lineHeight: 24,
            }}
          >
            {"We've sent a 6-digit verification code to\n"}
            <Text style={{ fontWeight: "600" }}>{email}</Text>
          </Text>

          {/* Code Input */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 32,
              paddingHorizontal: 16,
            }}
          >
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                value={digit}
                onChangeText={(value) => handleCodeChange(index, value)}
                onKeyPress={({ nativeEvent: { key } }) =>
                  handleKeyPress(index, key)
                }
                maxLength={1}
                keyboardType="number-pad"
                autoFocus={index === 0}
                style={{
                  width: 48,
                  height: 60,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "700",
                  textAlign: "center",
                  color: "#0EA5E9",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={verifying || code.some((digit) => !digit)}
            style={{
              backgroundColor:
                verifying || code.some((digit) => !digit)
                  ? "rgba(255, 255, 255, 0.5)"
                  : "#FFFFFF",
              paddingVertical: 16,
              borderRadius: 12,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {verifying ? (
              <ActivityIndicator color="#0EA5E9" />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    color: "#0EA5E9",
                    fontSize: 16,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Verify Email
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Resend Button */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend || resending}
            style={{
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: canResend ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                fontSize: 14,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {resending
                ? "Sending..."
                : canResend
                  ? "Resend Code"
                  : `Resend in ${countdown}s`}
            </Text>
          </TouchableOpacity>

          {/* Help Text */}
          <Text
            style={{
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              marginTop: 24,
              lineHeight: 20,
            }}
          >
            {
              "Didn't receive the code? Check your spam folder or try resending."
            }
          </Text>
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
