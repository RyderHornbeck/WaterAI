import { View, Text, TouchableOpacity } from "react-native";
import { Droplets, Trophy, Target } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  formatWaterAmount,
  getUnitLabel,
  ozToLiters,
} from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function StatsSection({ stats }) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);
  const router = useRouter();

  // Convert glasses calculation based on unit
  const getWaterConversion = () => {
    if (waterUnit === "liters") {
      const liters = ozToLiters(stats.totalOunces);
      return {
        value: liters.toFixed(1),
        label: "liters! 💧",
      };
    } else {
      const glasses = Math.round(stats.totalOunces / 8);
      return {
        value: glasses,
        label: "glasses of water! 💧",
      };
    }
  };

  const conversion = getWaterConversion();

  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: "#64748B",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Your Progress
      </Text>

      {/* Total Water */}
      <View
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#BFDBFE",
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              backgroundColor: "#DBEAFE",
              borderRadius: 28,
              borderWidth: 2,
              borderColor: "#93C5FD",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Droplets color="#0EA5E9" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              Total Water Intake
            </Text>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: "#0EA5E9",
                letterSpacing: -0.5,
              }}
            >
              {formatWaterAmount(stats.totalOunces, waterUnit)}
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#64748B",
                }}
              >
                {" "}
                {getUnitLabel(waterUnit)}
              </Text>
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#F0F9FF",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: "#0369A1",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            That's <Text style={{ fontWeight: "700" }}>{conversion.value}</Text>{" "}
            {conversion.label}
          </Text>
        </View>
      </View>

      {/* Goal Achievement Days */}
      <View
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#BFDBFE",
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              backgroundColor: "#FEF3C7",
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Trophy color="#F59E0B" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              Days You Hit Your Goal
            </Text>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: "#F59E0B",
                letterSpacing: -0.5,
              }}
            >
              {stats.daysHitGoal}
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "600",
                  color: "#64748B",
                }}
              >
                {" / "}
                {stats.totalDays}
              </Text>
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#FFFBEB",
            borderRadius: 12,
            padding: 12,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: "#92400E",
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            {stats.totalDays === 0
              ? "Start tracking to hit your goal! 🎯"
              : (() => {
                  const successRate = Math.round(
                    (stats.daysHitGoal / stats.totalDays) * 100,
                  );
                  if (successRate >= 80) {
                    return `${successRate}% success rate! Amazing! 🔥`;
                  } else if (successRate >= 50) {
                    return `${successRate}% success rate! Keep it up! 🔥`;
                  } else {
                    return `${successRate}% success rate! You've got this! 💪`;
                  }
                })()}
          </Text>
        </View>
      </View>

      {/* Generate new Daily Goal Button */}
      <TouchableOpacity
        onPress={() => router.push("/goal-onboarding")}
        style={{
          backgroundColor: "#0EA5E9",
          borderRadius: 16,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          shadowColor: "#0EA5E9",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Target size={22} color="#FFFFFF" />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#FFFFFF",
          }}
        >
          Generate new Daily Goal
        </Text>
      </TouchableOpacity>
    </View>
  );
}
