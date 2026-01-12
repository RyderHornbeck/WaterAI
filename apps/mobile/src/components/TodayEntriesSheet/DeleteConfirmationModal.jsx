import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";

export function DeleteConfirmationModal({
  visible,
  ounces,
  isDeletingInProgress,
  onConfirm,
  onCancel,
}) {
  if (!visible) return null;

  const formatOz = (oz) => {
    const num = parseFloat(oz);
    return num % 1 === 0 ? Math.round(num) : num;
  };

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
          padding: 24,
          width: "100%",
          maxWidth: 340,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Delete Entry
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#64748B",
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Are you sure you want to delete this {formatOz(ounces)} oz entry?
        </Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isDeletingInProgress}
            style={{
              flex: 1,
              backgroundColor: isDeletingInProgress ? "#E2E8F0" : "#F1F5F9",
              paddingVertical: 14,
              borderRadius: 12,
              opacity: isDeletingInProgress ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: "#64748B",
                fontSize: 16,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={isDeletingInProgress}
            style={{
              flex: 1,
              backgroundColor: isDeletingInProgress ? "#B91C1C" : "#DC2626",
              paddingVertical: 14,
              borderRadius: 12,
              opacity: isDeletingInProgress ? 0.8 : 1,
            }}
          >
            {isDeletingInProgress ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#fff" />
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Deleting...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Delete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
