import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/utils/auth/store";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export default function TestAuth() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState([]);
  const { auth, setAuth } = useAuthStore();

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, data }]);
    console.log(`[TEST AUTH ${timestamp}]`, message, data || "");
  };

  const testSignIn = async () => {
    setLogs([]);
    addLog("🔍 Starting sign-in test...");

    try {
      // Test environment variables
      addLog("📋 Checking environment variables...", {
        EXPO_PUBLIC_PROXY_BASE_URL: process.env.EXPO_PUBLIC_PROXY_BASE_URL,
        EXPO_PUBLIC_BASE_URL: process.env.EXPO_PUBLIC_BASE_URL,
      });

      const baseUrl =
        process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
        process.env.EXPO_PUBLIC_BASE_URL;

      if (!baseUrl) {
        addLog("❌ No base URL found!");
        return;
      }

      addLog("✅ Base URL found", { baseUrl });

      // Test sign-in API
      const apiUrl = `${baseUrl}/api/auth/signin`;
      addLog("📡 Calling sign-in API...", { url: apiUrl });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: "test@test.com",
          password: "test123",
        }),
      });

      addLog("📥 Response received", {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      });

      const text = await response.text();
      addLog("📄 Raw response", {
        length: text.length,
        preview: text.substring(0, 200),
      });

      let data;
      try {
        data = JSON.parse(text);
        addLog("✅ JSON parsed successfully", data);
      } catch (e) {
        addLog("❌ JSON parse failed", { error: e.message });
        return;
      }

      if (!response.ok) {
        addLog("❌ Sign-in failed", { error: data.error });
        return;
      }

      // Test saving auth
      addLog("💾 Saving auth to store...");
      await setAuth({ jwt: data.jwt, user: data.user });
      addLog("✅ Auth saved");

      // Verify auth was saved
      const savedAuth = useAuthStore.getState().auth;
      addLog("🔍 Verifying saved auth...", {
        hasAuth: !!savedAuth,
        hasJWT: !!savedAuth?.jwt,
        userId: savedAuth?.user?.id,
      });

      // Test authenticated API call
      addLog("🔐 Testing authenticated API call...");
      const testResponse = await fetchWithAuth("/api/user-stats");
      addLog("📥 Authenticated response", {
        status: testResponse.status,
        ok: testResponse.ok,
      });

      const testData = await testResponse.json();
      addLog("✅ Test complete!", testData);
    } catch (error) {
      addLog("❌ Error occurred", {
        name: error.name,
        message: error.message,
      });
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F0F9FF",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="dark" />

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          Auth Diagnostic Tool
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={testSignIn}
            style={{
              flex: 1,
              backgroundColor: "#3B82F6",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Run Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearLogs}
            style={{
              flex: 1,
              backgroundColor: "#64748B",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {auth && (
          <View
            style={{
              backgroundColor: "#DBEAFE",
              padding: 12,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontWeight: "600" }}>Current Auth State:</Text>
            <Text style={{ fontSize: 12, marginTop: 4 }}>
              User ID: {auth?.user?.id}
            </Text>
            <Text style={{ fontSize: 12 }}>Email: {auth?.user?.email}</Text>
            <Text style={{ fontSize: 12 }}>
              JWT: {auth?.jwt ? `${auth.jwt.substring(0, 20)}...` : "None"}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {logs.map((log, index) => (
          <View
            key={index}
            style={{
              backgroundColor: "#fff",
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
              borderLeftWidth: 3,
              borderLeftColor: log.message.includes("❌")
                ? "#EF4444"
                : "#10B981",
            }}
          >
            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>
              {log.timestamp}
            </Text>
            <Text style={{ fontWeight: "600", marginBottom: 4 }}>
              {log.message}
            </Text>
            {log.data && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#475569",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(log.data, null, 2)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
