import { View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";

export function BackButton({ onPress }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
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
  );
}
