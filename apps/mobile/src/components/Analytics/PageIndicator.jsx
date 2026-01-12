import React from "react";
import { View } from "react-native";

export function PageIndicator({ currentPage, totalPages = 2, scale = 1 }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 12 * scale,
        gap: 8 * scale,
      }}
    >
      {Array.from({ length: totalPages }).map((_, page) => (
        <View
          key={page}
          style={{
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: 4 * scale,
            backgroundColor: currentPage === page ? "#0EA5E9" : "#BFDBFE",
          }}
        />
      ))}
    </View>
  );
}
