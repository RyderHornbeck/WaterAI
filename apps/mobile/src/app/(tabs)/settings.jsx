import { useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { ExternalLink } from "lucide-react-native";
import * as Linking from "expo-linking";
import useUser from "@/utils/auth/useUser";
import { useAuth } from "@/utils/auth/useAuth";
import useUserSettingsStore from "@/stores/useUserSettingsStore";
import { useSettingsData } from "@/hooks/useSettingsData";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { SettingsHeader } from "@/components/Settings/SettingsHeader";
import { NotificationSection } from "@/components/Settings/NotificationSection";
import { AccountSection } from "@/components/Settings/AccountSection";
import { StatsSection } from "@/components/Settings/StatsSection";
import { LogoutButton } from "@/components/Settings/LogoutButton";
import { LoadingView } from "@/components/Settings/LoadingView";
import { handleLogout } from "@/utils/settingsHelpers";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user, loading: userLoading } = useUser();
  const { signOut } = useAuth();

  // Use global settings store
  const { fetchSettings } = useUserSettingsStore();

  // Custom hooks for data management
  const { stats, loading, fetchStats } = useSettingsData();
  const {
    notificationsEnabled,
    fetchNotificationSettings,
    handleNotificationToggle,
  } = useNotificationSettings();

  useEffect(() => {
    fetchStats();
    fetchNotificationSettings();
    fetchSettings(); // Fetch from global store
  }, []);

  // Refetch stats when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("Settings tab focused - forcing fresh data from database");
      fetchStats(true); // Force refetch from DB, bypass cache
      fetchNotificationSettings();
      fetchSettings(); // Will use cache if fresh
    }, []),
  );

  const onLogout = () => handleLogout(signOut, router);

  const handleOpenWebsite = async () => {
    const url = "https://www.waterai-smarthydration.com";
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  if (userLoading || loading) {
    return <LoadingView />;
  }

  return (
    <LinearGradient colors={["#BFDBFE", "#FFFFFF"]} style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsHeader />

        <NotificationSection
          notificationsEnabled={notificationsEnabled}
          onToggle={handleNotificationToggle}
        />

        <AccountSection user={user} />

        <StatsSection stats={stats} />

        {/* Fancy Website Link Section */}
        <View
          style={{ paddingHorizontal: 24, marginTop: 12, marginBottom: 20 }}
        >
          <TouchableOpacity
            onPress={handleOpenWebsite}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={["#0EA5E9", "#0284C7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#FFFFFF",
                      letterSpacing: 0.3,
                    }}
                  >
                    Visit Our Website
                  </Text>
                  <View
                    style={{
                      marginLeft: 8,
                      backgroundColor: "rgba(255,255,255,0.2)",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: "#FFFFFF",
                        textTransform: "uppercase",
                      }}
                    >
                      NEW
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#E0F2FE",
                    fontWeight: "500",
                  }}
                >
                  waterai-smarthydration.com
                </Text>
              </View>
              <View
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <ExternalLink size={22} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <LogoutButton onLogout={onLogout} />
      </ScrollView>
    </LinearGradient>
  );
}
