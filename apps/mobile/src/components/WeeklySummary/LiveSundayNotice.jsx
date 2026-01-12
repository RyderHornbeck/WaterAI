import React from "react";
import { View, Text } from "react-native";

export function LiveSundayNotice({ scale }) {
  return (
    <View
      style={{
        backgroundColor: "#DBEAFE",
        paddingVertical: 12 * scale,
        paddingHorizontal: 20 * scale,
        borderLeftWidth: 3 * scale,
        borderLeftColor: "#0EA5E9",
        marginHorizontal: 20 * scale,
        marginTop: 16 * scale,
        borderRadius: 8 * scale,
        zIndex: 9,
      }}
    >
      <Text
        style={{
          fontSize: 13 * scale,
          color: "#0369A1",
          textAlign: "center",
          lineHeight: 18 * scale,
          fontWeight: "600",
        }}
      >
        📊 Updates live as you track today
      </Text>
    </View>
  );
}
