import { View, Text } from "react-native";

export function HistoricalBanner({ message }) {
  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FCD34D",
      }}
    >
      <Text
        style={{
          fontSize: 15,
          color: "#92400E",
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        Historical Data
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#78350F",
          lineHeight: 18,
        }}
      >
        {message ||
          "Detailed entries are only available for the last 60 days. Only daily totals are shown for older dates."}
      </Text>
    </View>
  );
}
