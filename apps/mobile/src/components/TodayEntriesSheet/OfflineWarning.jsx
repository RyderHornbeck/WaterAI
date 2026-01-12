import { View, Text, TouchableOpacity } from "react-native";

export function OfflineWarning({ visible, onDismiss }) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        zIndex: 999999,
        backgroundColor: "#FEF3C7",
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: "#F59E0B",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#92400E",
              marginBottom: 4,
            }}
          >
            No Internet Connection
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#78350F",
              lineHeight: 20,
            }}
          >
            There is no WiFi or cellular. Any deletions made may not be saved.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#F59E0B",
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700" }}>
            ×
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
