import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Camera, Image as ImageIcon } from "lucide-react-native";

export function ImageSourceModal({
  visible,
  onUseCamera,
  onUseCameraRoll,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 400,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#1E293B",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Add Bottle Photo
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#64748B",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Choose where to get your photo
          </Text>

          <TouchableOpacity
            onPress={onUseCamera}
            style={{
              backgroundColor: "#3B82F6",
              padding: 18,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 12,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Camera color="#fff" size={24} />
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#fff" }}>
              Take Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onUseCameraRoll}
            style={{
              backgroundColor: "#fff",
              padding: 18,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderWidth: 2,
              borderColor: "#3B82F6",
              marginBottom: 16,
            }}
          >
            <ImageIcon color="#3B82F6" size={24} />
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#3B82F6" }}>
              Choose from Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, color: "#64748B", fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
