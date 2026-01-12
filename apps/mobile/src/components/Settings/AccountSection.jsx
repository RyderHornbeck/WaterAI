import { View, Text } from "react-native";
import { User, Mail } from "lucide-react-native";

export function AccountSection({ user }) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: "#64748B",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Account
      </Text>
      <View
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "#BFDBFE",
          borderRadius: 20,
          padding: 20,
        }}
      >
        {/* Username */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#BFDBFE",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: "#DBEAFE",
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#93C5FD",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <User color="#0EA5E9" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              Username
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {user?.name || "User"}
            </Text>
          </View>
        </View>

        {/* Email */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              backgroundColor: "#DBEAFE",
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#93C5FD",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Mail color="#0EA5E9" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#64748B",
                marginBottom: 4,
              }}
            >
              Email
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {user?.email || "No email"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
