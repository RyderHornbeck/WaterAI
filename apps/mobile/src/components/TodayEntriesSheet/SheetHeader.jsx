import { View, Text, TouchableOpacity } from "react-native";
import { X } from "lucide-react-native";
import { formatWaterAmount, getUnitLabel } from "@/utils/unitHelpers";
import useUserSettingsStore from "@/stores/useUserSettingsStore";

export function SheetHeader({
  title,
  totalOz,
  dailyGoal,
  percentComplete,
  onClose,
}) {
  const waterUnit = useUserSettingsStore((state) => state.waterUnit);

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#0F172A",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#64748B",
            marginTop: 4,
          }}
        >
          {formatWaterAmount(totalOz, waterUnit)} /{" "}
          {formatWaterAmount(dailyGoal, waterUnit)} {getUnitLabel(waterUnit)} (
          {percentComplete}%)
        </Text>
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={{
          width: 40,
          height: 40,
          backgroundColor: "#F0F9FF",
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X color="#3B82F6" size={24} />
      </TouchableOpacity>
    </View>
  );
}
