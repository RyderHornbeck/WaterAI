import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, Circle } from "lucide-react-native";

export function PlanCard({ plan, packageData, isSelected, onSelect }) {
  if (!packageData) return null;

  const isYearly = plan === "yearly";
  const title = isYearly ? "Yearly" : "Monthly";
  const subtitle = isYearly
    ? "Best value • Cancel anytime"
    : "Per month • Cancel anytime";

  return (
    <TouchableOpacity
      onPress={onSelect}
      style={{
        backgroundColor: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)",
        borderRadius: 20,
        padding: 24,
        borderWidth: 3,
        borderColor: isSelected ? "#FFFFFF" : "transparent",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isSelected ? 0.15 : 0,
        shadowRadius: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: isSelected ? "#0EA5E9" : "#FFFFFF",
          }}
        >
          {title}
        </Text>
        {isSelected ? (
          <CheckCircle size={28} color="#0EA5E9" />
        ) : (
          <Circle size={28} color="rgba(255, 255, 255, 0.6)" />
        )}
      </View>
      <Text
        style={{
          fontSize: 36,
          fontWeight: "800",
          color: isSelected ? "#0EA5E9" : "#FFFFFF",
          marginBottom: 4,
        }}
      >
        {packageData.product.priceString}
      </Text>
      <Text
        style={{
          fontSize: 15,
          color: isSelected ? "#64748B" : "rgba(255, 255, 255, 0.8)",
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}
