import { View, Text } from "react-native";
import {
  UserCircle,
  Calendar,
  Ruler,
  Weight,
  Activity,
} from "lucide-react-native";

export function ProfileSection({
  formatGender,
  age,
  formatHeight,
  formatWeight,
  formatActivityLevel,
}) {
  return (
    <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
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
        Profile Information
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
        {/* Gender */}
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
            <UserCircle color="#0EA5E9" size={24} />
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
              Gender
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {formatGender()}
            </Text>
          </View>
        </View>

        {/* Age */}
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
            <Calendar color="#0EA5E9" size={24} />
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
              Age
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {age ? `${age} years` : "Not set"}
            </Text>
          </View>
        </View>

        {/* Height */}
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
            <Ruler color="#0EA5E9" size={24} />
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
              Height
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {formatHeight()}
            </Text>
          </View>
        </View>

        {/* Weight */}
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
            <Weight color="#0EA5E9" size={24} />
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
              Weight
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {formatWeight()}
            </Text>
          </View>
        </View>

        {/* Activity Level */}
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
            <Activity color="#0EA5E9" size={24} />
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
              Activity Level
            </Text>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {formatActivityLevel()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
