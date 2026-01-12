import { View, Text } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Camera } from "lucide-react-native";

// Mini Water Bottle Component - Matches the main tracker
function MiniWaterBottle() {
  const fillProgress = useSharedValue(0);

  // Bottle dimensions (scaled down from main bottle)
  const scale = 0.25; // 25% of main bottle size
  const bottleWidth = 240 * scale;
  const bottleHeight = 360 * scale;
  const capWidth = 80 * scale;
  const capHeight = 28 * scale;
  const neckHeight = 45 * scale;
  const neckTop = capHeight;
  const bodyTop = capHeight + neckHeight;

  useEffect(() => {
    // Animate fill to 40%
    fillProgress.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(0.4, {
        duration: 1500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );
  }, []);

  const fillStyle = useAnimatedStyle(() => {
    const drawableHeight = bottleHeight - 12 * scale;
    return {
      height: fillProgress.value * drawableHeight,
    };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: bottleWidth + 40,
          height: bodyTop + bottleHeight,
          alignItems: "center",
        }}
      >
        {/* Bottle Cap */}
        <View
          style={{
            position: "absolute",
            top: 0,
            width: capWidth,
            height: capHeight,
            backgroundColor: "#0EA5E9",
            borderRadius: 8 * scale,
            borderTopLeftRadius: 10 * scale,
            borderTopRightRadius: 10 * scale,
            zIndex: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 * scale },
            shadowOpacity: 0.15,
            shadowRadius: 3 * scale,
          }}
        >
          {/* Cap ridges */}
          <View
            style={{
              position: "absolute",
              top: 6 * scale,
              left: 12 * scale,
              right: 12 * scale,
              height: 3 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: 2 * scale,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 12 * scale,
              left: 12 * scale,
              right: 12 * scale,
              height: 3 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderRadius: 2 * scale,
            }}
          />
        </View>

        {/* Bottle Neck */}
        <View
          style={{
            position: "absolute",
            top: neckTop,
            width: capWidth,
            height: neckHeight,
            backgroundColor: "rgba(224, 242, 254, 0.4)",
            borderLeftWidth: 4 * scale,
            borderRightWidth: 4 * scale,
            borderColor: "#BFDBFE",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 8 * scale,
              top: 0,
              bottom: 0,
              width: 20 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.25)",
            }}
          />
        </View>

        {/* Main Bottle Body */}
        <View
          style={{
            position: "absolute",
            top: bodyTop,
            width: bottleWidth,
            height: bottleHeight,
            backgroundColor: "rgba(224, 242, 254, 0.3)",
            borderRadius: 28 * scale,
            borderTopLeftRadius: 32 * scale,
            borderTopRightRadius: 32 * scale,
            borderBottomLeftRadius: 32 * scale,
            borderBottomRightRadius: 32 * scale,
            borderWidth: 6 * scale,
            borderColor: "#BFDBFE",
            overflow: "hidden",
          }}
        >
          {/* Animated Water Fill */}
          <Animated.View
            style={[
              {
                position: "absolute",
                bottom: 6 * scale,
                left: 6 * scale,
                right: 6 * scale,
                backgroundColor: "#0EA5E9",
                borderRadius: 20 * scale,
                borderBottomLeftRadius: 26 * scale,
                borderBottomRightRadius: 26 * scale,
              },
              fillStyle,
            ]}
          />

          {/* Shine effects */}
          <View
            style={{
              position: "absolute",
              top: 30 * scale,
              left: 25 * scale,
              width: 50 * scale,
              height: 150 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.35)",
              borderRadius: 25 * scale,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 180 * scale,
              right: 28 * scale,
              width: 40 * scale,
              height: 100 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: 20 * scale,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 20 * scale,
              left: 30 * scale,
              right: 30 * scale,
              height: 70 * scale,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: 25 * scale,
            }}
          />
        </View>
      </View>

      <Text
        style={{
          fontSize: 11,
          color: "#64748B",
          marginTop: 12,
          fontWeight: "600",
        }}
      >
        Tap to view
      </Text>
    </View>
  );
}

// Mini Camera Button Component
function MiniCameraButton() {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 80,
          height: 80,
          backgroundColor: "#000000",
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        }}
      >
        <Camera size={36} color="#FFFFFF" strokeWidth={2.5} />
      </View>
      <Text
        style={{
          fontSize: 11,
          color: "#64748B",
          marginTop: 12,
          fontWeight: "600",
        }}
      >
        Tap to track
      </Text>
    </View>
  );
}

export function UITutorialQuestion() {
  return (
    <View style={{ gap: 24 }}>
      {/* Main bottle interaction */}
      <Animated.View
        entering={FadeIn.delay(100)}
        style={{
          backgroundColor: "#FFFFFF",
          padding: 24,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "#E0F2FE",
          shadowColor: "#0EA5E9",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        }}
      >
        <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
          {/* Mini Bottle UI */}
          <MiniWaterBottle />

          {/* Explanation */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: "#0EA5E9",
                }}
              >
                Main Tracker
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#334155",
              }}
            >
              Press the main tracker bottle to see all your water entries for
              the day
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Camera button interaction */}
      <Animated.View
        entering={FadeIn.delay(200)}
        style={{
          backgroundColor: "#FFFFFF",
          padding: 24,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "#E0F2FE",
          shadowColor: "#0EA5E9",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        }}
      >
        <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
          {/* Mini Camera Button UI */}
          <MiniCameraButton />

          {/* Explanation */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: "#0EA5E9",
                }}
              >
                Camera Button
              </Text>
            </View>
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#334155",
              }}
            >
              Tap the camera to take a photo of your drink. Water AI figures out
              what drink it is and how much it counts toward your daily water
              goal.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Quick tip */}
      <Animated.View
        entering={FadeIn.delay(300)}
        style={{
          backgroundColor: "#FEF3C7",
          padding: 18,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: "#FDE047",
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <Text style={{ fontSize: 22, marginRight: 12 }}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#92400E",
              marginBottom: 4,
            }}
          >
            Pro Tip
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: "#92400E",
            }}
          >
            You can also manually add drinks or describe them with text. Water
            AI works with all methods!
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
