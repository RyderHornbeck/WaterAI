import React from "react";
import { View, Text } from "react-native";
import { Droplet } from "lucide-react-native";

export function NoDataState({ scale }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 48 * scale,
      }}
    >
      <View
        style={{
          width: 80 * scale,
          height: 80 * scale,
          borderRadius: 40 * scale,
          backgroundColor: "#DBEAFE",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20 * scale,
        }}
      >
        <Droplet size={40 * scale} color="#0EA5E9" />
      </View>
      <Text
        style={{
          fontSize: 20 * scale,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 8 * scale,
          textAlign: "center",
        }}
      >
        No Water Tracked
      </Text>
      <Text
        style={{
          fontSize: 14 * scale,
          color: "#64748B",
          textAlign: "center",
          lineHeight: 20 * scale,
        }}
      >
        Start tracking your hydration to see your weekly summary here
      </Text>
    </View>
  );
}
