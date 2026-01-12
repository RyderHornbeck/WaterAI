import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Terminal } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

export function ExpoGoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <LinearGradient
      colors={["#0EA5E9", "#38BDF8", "#7DD3FC"]}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />

      {/* Back Button */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/account/signup")}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 40,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 40,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: 100,
            height: 100,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: 50,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Terminal size={50} color="#FFFFFF" />
        </View>

        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Expo Go Detected
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: "rgba(255, 255, 255, 0.95)",
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 24,
          }}
        >
          In-app purchases require native StoreKit modules that aren't available
          in Expo Go.
        </Text>

        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: 16,
            padding: 20,
            width: "100%",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#FFFFFF",
              marginBottom: 12,
            }}
          >
            To test in-app purchases:
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              Option 1: Development Build
            </Text>
            <View
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#FFFFFF",
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                eas build --profile development --platform ios
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.9)",
                lineHeight: 18,
              }}
            >
              Then install the build on your device and run with:
            </Text>
            <View
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: 8,
                padding: 12,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#FFFFFF",
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                npx expo start --dev-client
              </Text>
            </View>
          </View>

          <View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              Option 2: TestFlight
            </Text>
            <View
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#FFFFFF",
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                eas build --platform ios --auto-submit
              </Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.9)",
                marginTop: 8,
                lineHeight: 18,
              }}
            >
              This will build and upload to TestFlight for testing on real
              devices.
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 12,
            padding: 16,
            width: "100%",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: "rgba(255, 255, 255, 0.95)",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            💡 You can still develop other features in Expo Go. IAP is only
            disabled in Expo Go.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
