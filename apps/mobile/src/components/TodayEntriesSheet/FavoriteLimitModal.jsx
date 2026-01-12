import { Modal, View, Text, TouchableOpacity } from "react-native";
import { AlertCircle } from "lucide-react-native";

export function FavoriteLimitModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#FEF3C7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              alignSelf: "center",
            }}
          >
            <AlertCircle size={32} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#0F172A",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Favorites Limit Reached
          </Text>

          {/* Message */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              color: "#64748B",
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 24,
            }}
          >
            You've reached the maximum of 25 favorited entries. Remove a
            favorite to add a new one.
          </Text>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: "#F59E0B",
              paddingVertical: 16,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Got It
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
