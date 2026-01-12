import {
  View,
  Image,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";

export function ImagePreview({
  selectedImage,
  analyzing,
  analysisStep,
  showManualEntry,
  manualOunces,
  setManualOunces,
  waterAmount,
  onCancelAnalysis,
  onManualEntry,
}) {
  if (!selectedImage) return null;

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
      <Image
        source={{ uri: selectedImage.uri }}
        style={{
          width: "100%",
          height: 280,
          borderRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}
        resizeMode="cover"
      />

      {/* Analysis Progress Overlay */}
      {analyzing && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            padding: 20,
            borderRadius: 20,
            alignItems: "center",
          }}
        >
          <ActivityIndicator
            color="#0EA5E9"
            size="small"
            style={{ marginBottom: 12 }}
          />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: "#fff",
              textAlign: "center",
            }}
          >
            {analysisStep || "Processing..."}
          </Text>
          <TouchableOpacity
            onPress={onCancelAnalysis}
            style={{
              marginTop: 12,
              paddingVertical: 8,
              paddingHorizontal: 16,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Entry Fallback */}
      {showManualEntry && !analyzing && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            padding: 20,
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#64748B",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Enter amount manually
          </Text>
          <TextInput
            value={manualOunces}
            onChangeText={setManualOunces}
            placeholder="Ounces (e.g., 8)"
            keyboardType="number-pad"
            style={{
              backgroundColor: "#F8FAFC",
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              fontSize: 16,
              fontWeight: "600",
              color: "#0F172A",
              marginBottom: 12,
              textAlign: "center",
            }}
          />
          <TouchableOpacity
            onPress={onManualEntry}
            style={{
              backgroundColor: "#0EA5E9",
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 15,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              Add Water
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detection Result */}
      {waterAmount && !showManualEntry && (
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            padding: 20,
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#0EA5E9",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Detected Water
          </Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: "#0F172A",
              textAlign: "center",
              letterSpacing: -1,
            }}
          >
            {waterAmount} oz
          </Text>
        </View>
      )}
    </View>
  );
}
