import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";

export default function NumberRollerQuestion({ question, value, onChange }) {
  const insets = useSafeAreaInsets();

  // Create age array
  const ages = Array.from(
    { length: question.maxAge - question.minAge + 1 },
    (_, i) => question.minAge + i,
  );

  const selectedValue = value || question.defaultAge;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      {/* Question Header */}
      <View style={{ paddingHorizontal: 24, marginBottom: 24, marginTop: 20 }}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: "#1F2937",
            marginBottom: 12,
            lineHeight: 38,
          }}
        >
          {question.question}
        </Text>
        <Text style={{ fontSize: 17, color: "#6B7280", lineHeight: 24 }}>
          {question.subtitle}
        </Text>
      </View>

      {/* Native iOS Picker */}
      <View
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}
      >
        <Picker
          selectedValue={selectedValue}
          onValueChange={(itemValue) => onChange(itemValue)}
          style={{ height: 200 }}
          itemStyle={{
            fontSize: 24,
            height: 200,
            color: "#1F2937",
          }}
        >
          {ages.map((age) => (
            <Picker.Item key={age} label={`${age}`} value={age} />
          ))}
        </Picker>

        {/* Label */}
        <View style={{ marginTop: 12, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 15,
              color: "#9CA3AF",
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            years old
          </Text>
        </View>
      </View>
    </View>
  );
}
