import { Modal, View, TouchableOpacity, Platform } from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthModal, useAuthStore } from "./store";
import { AuthWebView } from "./AuthWebView";
import { useEffect } from "react";

export default function AuthModal() {
  const { isOpen, mode, close } = useAuthModal();
  const { auth, isReady } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isAuthenticated = isReady ? !!auth : null;

  // Close modal when authentication succeeds
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      close();
    }
  }, [isAuthenticated, isOpen, close]);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Close Button */}
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? insets.top + 12 : 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#fff",
          }}
        >
          <TouchableOpacity
            onPress={close}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X color="#6B7280" size={20} />
          </TouchableOpacity>
        </View>

        {/* Auth WebView */}
        <View style={{ flex: 1 }}>
          <AuthWebView
            mode={mode}
            proxyURL={process.env.EXPO_PUBLIC_PROXY_BASE_URL}
            baseURL={process.env.EXPO_PUBLIC_BASE_URL}
          />
        </View>
      </View>
    </Modal>
  );
}
