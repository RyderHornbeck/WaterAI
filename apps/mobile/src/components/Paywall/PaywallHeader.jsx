import { View, Text } from "react-native";
import { Droplet } from "lucide-react-native";

export function PaywallHeader() {
  return (
    <View style={{ alignItems: "center", marginBottom: 48 }}>
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
        <Droplet size={50} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      <Text
        style={{
          fontSize: 32,
          fontWeight: "800",
          color: "#FFFFFF",
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: 0.5,
        }}
      >
        Unlock Full Access
      </Text>
      <Text
        style={{
          fontSize: 18,
          color: "rgba(255, 255, 255, 0.95)",
          textAlign: "center",
          lineHeight: 26,
        }}
      >
        Track unlimited drinks with AI
      </Text>
    </View>
  );
}
