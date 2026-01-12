import { View, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text
            style={{
              marginTop: 16,
              fontSize: 16,
              color: "#64748B",
            }}
          >
            Loading your data...
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
