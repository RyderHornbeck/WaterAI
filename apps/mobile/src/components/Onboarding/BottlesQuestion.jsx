import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { Camera, X } from "lucide-react-native";

export function BottlesQuestion({
  bottles,
  onPickImage,
  onUpdateBottleOunces,
  onRemoveBottle,
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      <View style={{ gap: 16, paddingBottom: 20 }}>
        {bottles.map((bottle) => (
          <View
            key={bottle.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              borderWidth: 2,
              borderColor: "#E2E8F0",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Image
                source={{ uri: bottle.uri }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: "#F1F5F9",
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#64748B",
                    marginBottom: 8,
                  }}
                >
                  Bottle size (oz)
                </Text>
                <TextInput
                  placeholder=""
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={bottle.ounces}
                  onChangeText={(text) => onUpdateBottleOunces(bottle.id, text)}
                  editable={true}
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#0F172A",
                    borderWidth: 2,
                    borderColor: "#E2E8F0",
                  }}
                />
              </View>
              <TouchableOpacity
                onPress={() => onRemoveBottle(bottle.id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#FEE2E2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color="#EF4444" size={18} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          onPress={onPickImage}
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
            borderWidth: 2,
            borderColor: "#3B82F6",
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Camera color="#3B82F6" size={32} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#3B82F6",
            }}
          >
            Add a Bottle
          </Text>
          <Text style={{ fontSize: 14, color: "#64748B" }}>
            Take a photo of your water bottle
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#64748B",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Take a clear photo of the full bottle/source and label
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
