import React from "react";
import { View, ActivityIndicator } from "react-native";

export function LoadingState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#0EA5E9" />
    </View>
  );
}
