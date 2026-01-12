import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Check } from "lucide-react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export function ImageEditor({ photo, onConfirm, onCancel }) {
  const insets = useSafeAreaInsets();

  const handleConfirm = () => {
    onConfirm(photo);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 20,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={onCancel}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X color="#fff" size={24} />
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            Review Photo
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Image Preview */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={{ uri: photo.uri }}
          style={{
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT * 0.7,
          }}
          resizeMode="contain"
        />

        {/* Instruction overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 140,
            left: 20,
            right: 20,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            paddingVertical: 16,
            paddingHorizontal: 20,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: "600",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Make sure the bottle and label are clearly visible
          </Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <View
        style={{
          position: "absolute",
          bottom: insets.bottom + 20,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={onCancel}
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              paddingVertical: 16,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              flex: 1,
              backgroundColor: "#0EA5E9",
              paddingVertical: 16,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Check color="#fff" size={20} />
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              Use Photo
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
