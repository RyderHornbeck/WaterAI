import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export function ErrorState({ error, onRetry, scale }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24 * scale,
      }}
    >
      <View
        style={{
          width: 64 * scale,
          height: 64 * scale,
          borderRadius: 32 * scale,
          backgroundColor: "#FEE2E2",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16 * scale,
        }}
      >
        <Text style={{ fontSize: 32 * scale }}>😕</Text>
      </View>
      <Text
        style={{
          fontSize: 18 * scale,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 8 * scale,
          textAlign: "center",
        }}
      >
        Couldn't Load Summary
      </Text>
      <Text
        style={{
          fontSize: 14 * scale,
          color: "#64748B",
          textAlign: "center",
          marginBottom: 24 * scale,
        }}
      >
        {error}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: "#0EA5E9",
          paddingHorizontal: 24 * scale,
          paddingVertical: 14 * scale,
          borderRadius: 12 * scale,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 16 * scale,
            fontWeight: "700",
          }}
        >
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}
