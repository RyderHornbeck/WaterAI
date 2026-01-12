import { View, Text } from "react-native";
import { useEffect } from "react";
import Animated, {
  FadeInDown,
  BounceIn,
  ZoomIn,
} from "react-native-reanimated";

export function StatQuestion({ stats, onAnswer }) {
  // Auto-mark as viewed so user can proceed
  useEffect(() => {
    if (onAnswer) {
      onAnswer("viewed");
    }
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        paddingTop: 40,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 20,
          justifyContent: "center",
        }}
      >
        {stats.map((stat, index) => (
          <Animated.View
            key={index}
            entering={BounceIn.delay(index * 150).duration(800)}
            style={{
              width: "45%",
              minWidth: 150,
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              shadowColor: "#0EA5E9",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              borderWidth: 2,
              borderColor: "#E0F2FE",
            }}
          >
            <Text
              style={{
                fontSize: 48,
                marginBottom: 12,
              }}
            >
              {stat.icon}
            </Text>

            <Animated.Text
              entering={ZoomIn.delay(index * 150 + 300).duration(600)}
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "#0EA5E9",
                marginBottom: 8,
              }}
            >
              {stat.value}
            </Animated.Text>

            <Text
              style={{
                fontSize: 14,
                color: "#64748B",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {stat.label}
            </Text>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeInDown.delay(800).duration(800)}
        style={{
          marginTop: 40,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: "#64748B",
            textAlign: "center",
            lineHeight: 24,
            fontStyle: "italic",
          }}
        >
          These benefits start showing up in just days
        </Text>
      </Animated.View>
    </View>
  );
}
