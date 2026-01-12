import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function LoadingView() {
  return (
    <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    </LinearGradient>
  );
}
