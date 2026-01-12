import { View, Text } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

export function WelcomeQuestion({ onAnswer }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
      }}
    >
      <Animated.Text
        entering={ZoomIn.delay(200).duration(600)}
        style={{
          fontSize: 72,
          marginBottom: 40,
        }}
      >
        💧
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(400).duration(800)}
        style={{
          fontSize: 36,
          fontWeight: "bold",
          color: "#0EA5E9",
          textAlign: "center",
          marginBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        Ready to transform
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(600).duration(800)}
        style={{
          fontSize: 36,
          fontWeight: "bold",
          color: "#1E293B",
          textAlign: "center",
          marginBottom: 40,
          paddingHorizontal: 20,
        }}
      >
        your hydration?
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(800).duration(800)}
        style={{
          paddingHorizontal: 40,
          marginBottom: 60,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 28,
          }}
        >
          Let's Begin your water tracking journey with Water ai
        </Text>
      </Animated.View>
    </View>
  );
}
