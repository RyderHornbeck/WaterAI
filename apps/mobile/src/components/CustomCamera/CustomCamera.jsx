import { useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { X, Zap } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function CustomCamera({ onCapture, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState("off");
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        // Immediately call onCapture without showing review screen
        onCapture(photo);
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Camera permission is required to take photos
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#0EA5E9",
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={{
            marginTop: 16,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#94A3B8", fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
      >
        {/* Top Overlay - Close Button and Instructions */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 20,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
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

            {/* Flash Toggle Button */}
            <TouchableOpacity
              onPress={() => setFlash(flash === "off" ? "on" : "off")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  flash === "on"
                    ? "rgba(234, 179, 8, 0.9)"
                    : "rgba(0, 0, 0, 0.6)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap
                color="#fff"
                size={24}
                fill={flash === "on" ? "#fff" : "transparent"}
              />
            </TouchableOpacity>
          </View>

          {/* Instruction Text */}
          <View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 15,
                fontWeight: "600",
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Take a clear photo of the full{"\n"}bottle/source and label
            </Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 40,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          {/* Capture Button */}
          <TouchableOpacity
            onPress={takePicture}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              borderWidth: 6,
              borderColor: "#fff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#fff",
              }}
            />
          </TouchableOpacity>

          {/* Flip Camera Button */}
          <TouchableOpacity
            onPress={() => setFacing(facing === "back" ? "front" : "back")}
            style={{
              marginTop: 24,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              Flip Camera
            </Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}
