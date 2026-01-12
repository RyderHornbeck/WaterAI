import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export function TextDescriptionModal({
  visible,
  textDescription,
  setTextDescription,
  onClose,
  onAnalyze,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F173A",
                marginBottom: 16,
              }}
            >
              Describe what you drank
            </Text>
            <TextInput
              value={textDescription}
              onChangeText={setTextDescription}
              placeholder="e.g., 'large coffee cup' or 'water bottle'"
              placeholderTextColor="#94A3B8"
              multiline
              style={{
                backgroundColor: "#F8FAFC",
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 16,
                fontSize: 16,
                color: "#0F172A",
                marginBottom: 16,
                minHeight: 100,
                textAlignVertical: "top",
              }}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  setTextDescription("");
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#F1F5F9",
                  paddingVertical: 16,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 17,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onAnalyze}
                disabled={!textDescription.trim()}
                style={{
                  flex: 1,
                  backgroundColor: textDescription.trim()
                    ? "#0EA5E9"
                    : "#E2E8F0",
                  paddingVertical: 16,
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    color: textDescription.trim() ? "#fff" : "#94A3B8",
                    fontSize: 17,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Analyze
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
