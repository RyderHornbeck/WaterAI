import { Alert } from "react-native";

export function handleLogout(signOut, router) {
  Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        try {
          await signOut();
          router.replace("/onboarding");
        } catch (err) {
          console.error("Logout error:", err);
        }
      },
    },
  ]);
}
