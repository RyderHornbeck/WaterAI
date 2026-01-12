import { View, Text } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Droplets } from "lucide-react-native";

export function WaterAIExplainerQuestion({ question }) {
  return (
    <View style={{ gap: 28 }}>
      {/* Main explanation card - combined How it works and Example */}
      <Animated.View
        entering={FadeInUp.delay(100)}
        style={{
          backgroundColor: "#FFFFFF",
          padding: 24,
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "#E0F2FE",
          shadowColor: "#0EA5E9",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        }}
      >
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            How it works
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 24,
              color: "#475569",
            }}
          >
            {question?.content?.mainText}
          </Text>
        </View>

        {/* Example section */}
        <View
          style={{
            backgroundColor: "#F0F9FF",
            padding: 20,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: "#BAE6FD",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#0EA5E9",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Droplets size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#0EA5E9",
              }}
            >
              {question?.content?.example?.title}
            </Text>
          </View>

          {/* Water counts fully */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              paddingLeft: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#0EA5E9",
              }}
            />
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#0F172A",
                fontWeight: "600",
                flex: 1,
              }}
            >
              {question?.content?.example?.waterText}
            </Text>
          </View>

          {/* Other drinks partial */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              paddingLeft: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#0EA5E9",
                marginTop: 8,
              }}
            />
            <Text
              style={{
                fontSize: 15,
                lineHeight: 22,
                color: "#475569",
                flex: 1,
              }}
            >
              {question?.content?.example?.otherDrinksText}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Visual breakdown - water/soda/coffee percentages */}
      <Animated.View
        entering={FadeInUp.delay(200)}
        style={{
          backgroundColor: "#FFFFFF",
          padding: 20,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: "#E2E8F0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          {/* Water 100% */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#0EA5E9",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 24 }}>💧</Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#0EA5E9",
                marginBottom: 2,
              }}
            >
              Water
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>100%</Text>
          </View>

          {/* Arrow */}
          <Text style={{ fontSize: 20, marginHorizontal: 8 }}>→</Text>

          {/* Soda 75% */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#F59E0B",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 24 }}>🥤</Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#F59E0B",
                marginBottom: 2,
              }}
            >
              Soda
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>~75%</Text>
          </View>

          {/* Arrow */}
          <Text style={{ fontSize: 20, marginHorizontal: 8 }}>→</Text>

          {/* Coffee ~95% */}
          <View style={{ alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#8B4513",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 24 }}>☕</Text>
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8B4513",
                marginBottom: 2,
              }}
            >
              Coffee
            </Text>
            <Text style={{ fontSize: 11, color: "#64748B" }}>~95%</Text>
          </View>
        </View>
      </Animated.View>

      {/* Feature highlight */}
      <Animated.View
        entering={FadeInUp.delay(300)}
        style={{
          backgroundColor: "#FEF3C7",
          padding: 18,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: "#FDE047",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Text style={{ fontSize: 28 }}>⚡</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#92400E",
              marginBottom: 4,
            }}
          >
            Smart & Accurate
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: "#92400E",
            }}
          >
            Our AI recognizes containers and liquids to give you precise
            hydration tracking
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
