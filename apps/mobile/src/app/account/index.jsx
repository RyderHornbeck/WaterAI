import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User,
  Mail,
  Droplets,
  Target,
  Hand,
  Coffee,
  ChevronRight,
  LogOut,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import useUser from "@/utils/auth/useUser";
import { useAuth } from "@/utils/auth/useAuth";

export default function Account() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, loading: userLoading } = useUser();
  const { signOut } = useAuth();

  const [goal, setGoal] = useState("");
  const [handSize, setHandSize] = useState("");
  const [sipSize, setSipSize] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch("/api/user-goal");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data.goal) {
        setGoal(data.goal.toString());
      }
      // Fetch hand size and sip size from settings
      // For now, we'll set defaults if not available
      setHandSize("medium");
      setSipSize("medium");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    const goalNum = parseInt(goal, 10);
    if (!goalNum || goalNum < 1 || goalNum > 500) {
      Alert.alert(
        "Invalid Goal",
        "Please enter a goal between 1 and 500 ounces.",
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/user-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goalNum,
          handSize,
          sipSize,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      Alert.alert("Success", "Your preferences have been updated!");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/welcome");
          } catch (err) {
            console.error("Logout error:", err);
          }
        },
      },
    ]);
  };

  if (userLoading || loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F0F9FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F9FF" }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Account
          </Text>
          <Text style={{ fontSize: 16, color: "#64748B" }}>
            Manage your profile and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#DBEAFE",
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <User color="#3B82F6" size={32} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: "#1E293B",
                    marginBottom: 4,
                  }}
                >
                  {user?.name || "User"}
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Mail color="#64748B" size={16} />
                  <Text style={{ fontSize: 14, color: "#64748B" }}>
                    {user?.email || "No email"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Daily Goal Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "#DBEAFE",
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Target color="#3B82F6" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 20, fontWeight: "600", color: "#1E293B" }}
                >
                  Daily Goal
                </Text>
                <Text style={{ fontSize: 14, color: "#64748B" }}>
                  Your target water intake
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#64748B",
                  marginBottom: 8,
                }}
              >
                Goal (ounces)
              </Text>
              <TextInput
                value={goal}
                onChangeText={setGoal}
                keyboardType="number-pad"
                style={{
                  backgroundColor: "#F8FAFC",
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#1E293B",
                  borderWidth: 2,
                  borderColor: "#E2E8F0",
                }}
                placeholder="64"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: "#1E293B",
                marginBottom: 20,
              }}
            >
              Preferences
            </Text>

            {/* Hand Size */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Hand color="#64748B" size={20} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#1E293B",
                    marginLeft: 8,
                  }}
                >
                  Hand Size
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["small", "medium", "large"].map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setHandSize(size)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor:
                        handSize === size ? "#3B82F6" : "#F8FAFC",
                      borderWidth: 2,
                      borderColor: handSize === size ? "#3B82F6" : "#E2E8F0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: handSize === size ? "#fff" : "#64748B",
                        textAlign: "center",
                        textTransform: "capitalize",
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sip Size */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Coffee color="#64748B" size={20} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#1E293B",
                    marginLeft: 8,
                  }}
                >
                  Sip Size
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["small", "medium", "large"].map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSipSize(size)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: sipSize === size ? "#10B981" : "#F8FAFC",
                      borderWidth: 2,
                      borderColor: sipSize === size ? "#10B981" : "#E2E8F0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: sipSize === size ? "#fff" : "#64748B",
                        textAlign: "center",
                        textTransform: "capitalize",
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={saveSettings}
            disabled={saving}
            style={{
              backgroundColor: "#3B82F6",
              paddingVertical: 18,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: saving ? 0.6 : 1,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Text>
            {!saving && (
              <ChevronRight color="#fff" size={24} style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "#FEE2E2",
              paddingVertical: 16,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#FCA5A5",
            }}
          >
            <LogOut color="#DC2626" size={20} />
            <Text
              style={{
                color: "#DC2626",
                fontSize: 16,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 60,
                height: 60,
                backgroundColor: "#DBEAFE",
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Droplets color="#3B82F6" size={32} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1E293B",
                marginBottom: 4,
              }}
            >
              Hydration Tracker
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Stay healthy, stay hydrated
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
