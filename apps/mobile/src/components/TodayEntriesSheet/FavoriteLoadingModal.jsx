import { View, Text, ActivityIndicator } from "react-native";

export function FavoriteLoadingModal({ visible, action }) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 32,
          alignItems: "center",
          width: "100%",
          maxWidth: 300,
        }}
      >
        <ActivityIndicator size="large" color="#FCD34D" />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#0F172A",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {action === "favoriting" ? "Favoriting..." : "Unfavoriting..."}
        </Text>
      </View>
    </View>
  );
}
