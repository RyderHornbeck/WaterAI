import { View, Text, TouchableOpacity } from "react-native";
import { LogOut } from "lucide-react-native";

export function LogoutButton({ onLogout }) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <TouchableOpacity
        onPress={onLogout}
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#BFDBFE",
          paddingVertical: 18,
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LogOut color="#DC2626" size={22} />
        <Text
          style={{
            color: "#DC2626",
            fontSize: 17,
            fontWeight: "700",
            marginLeft: 10,
          }}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
