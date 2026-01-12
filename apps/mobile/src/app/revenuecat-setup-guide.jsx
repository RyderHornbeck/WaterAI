import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, AlertCircle, CheckCircle, Copy } from "lucide-react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";

export default function RevenueCatSetupGuide() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = async (text, section) => {
    await Clipboard.setStringAsync(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Check what we can detect
  let Purchases = null;
  let isModuleAvailable = false;

  try {
    const PurchasesModule = require("react-native-purchases");
    Purchases = PurchasesModule.default || PurchasesModule;
    isModuleAvailable = true;
  } catch (error) {
    isModuleAvailable = false;
  }

  const appJsonConfig = `{
  "expo": {
    "plugins": [
      [
        "react-native-purchases",
        {
          "iosAppGroupIdentifier": "group.com.yourcompany.yourapp"
        }
      ]
    ]
  }
}`;

  const packageJsonConfig = `{
  "dependencies": {
    "react-native-purchases": "^8.2.2",
    "react-native-purchases-ui": "^8.2.2"
  }
}`;

  const iosCapabilities = `Required iOS Capabilities:
• In-App Purchase
• StoreKit Configuration`;

  const appStoreConnectSteps = `1. Go to App Store Connect
2. Select your app
3. Go to "App Information"
4. Scroll to "In-App Purchases and Subscriptions"
5. Add your subscription products
6. Configure pricing and availability
7. Submit for review`;

  const revenueCatSetupSteps = `1. Go to RevenueCat Dashboard (app.revenuecat.com)
2. Create a new Project
3. Add iOS App:
   - Bundle ID: Your app's bundle ID
   - Shared Secret: From App Store Connect
4. Create Entitlement called "access"
5. Create Offering called "default"
6. Attach products to offering
7. Copy your Public SDK Key (starts with "appl_")`;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0F172A",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginLeft: 16,
            color: "#FFFFFF",
            flex: 1,
          }}
        >
          RevenueCat Setup Guide
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        <View
          style={{
            backgroundColor: isModuleAvailable
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            borderColor: isModuleAvailable
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(239, 68, 68, 0.3)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {isModuleAvailable ? (
              <CheckCircle size={24} color="#22C55E" />
            ) : (
              <AlertCircle size={24} color="#EF4444" />
            )}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: isModuleAvailable ? "#22C55E" : "#EF4444",
                marginLeft: 12,
              }}
            >
              {isModuleAvailable
                ? "Module Detected ✓"
                : "Module Not Detected ✗"}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: "#94A3B8", lineHeight: 20 }}>
            {isModuleAvailable
              ? "The react-native-purchases module is installed and can be imported. This is a good sign!"
              : "The react-native-purchases module cannot be imported. This means either: (1) The package isn't installed, or (2) The Expo config plugin isn't configured."}
          </Text>
        </View>

        {/* What's Required */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 16,
            }}
          >
            🔧 What's Required for RevenueCat
          </Text>

          {/* 1. Package.json */}
          <View
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#60A5FA",
                }}
              >
                1. NPM Package
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(packageJsonConfig, "package")}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy size={14} color="#60A5FA" />
                <Text style={{ fontSize: 12, color: "#60A5FA" }}>
                  {copiedSection === "package" ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: "#93C5FD",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              The react-native-purchases package must be installed:
            </Text>

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#E2E8F0",
                  fontFamily: "monospace",
                }}
              >
                {packageJsonConfig}
              </Text>
            </View>
          </View>

          {/* 2. App.json Plugin */}
          <View
            style={{
              backgroundColor: "rgba(168, 85, 247, 0.1)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#C084FC",
                }}
              >
                2. Expo Config Plugin
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(appJsonConfig, "appjson")}
                style={{
                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy size={14} color="#C084FC" />
                <Text style={{ fontSize: 12, color: "#C084FC" }}>
                  {copiedSection === "appjson" ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: "#E9D5FF",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              The app.json (or app.config.js) must include the RevenueCat
              plugin:
            </Text>

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#E2E8F0",
                  fontFamily: "monospace",
                }}
              >
                {appJsonConfig}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.2)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#E9D5FF",
                  fontWeight: "600",
                }}
              >
                ⚠️ THIS IS LIKELY MISSING!
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#E9D5FF",
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Without this plugin, the native iOS code for RevenueCat won't be
                linked, and the module won't work in EAS builds.
              </Text>
            </View>
          </View>

          {/* 3. iOS Capabilities */}
          <View
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#4ADE80",
                }}
              >
                3. iOS Capabilities
              </Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(iosCapabilities, "capabilities")}
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy size={14} color="#4ADE80" />
                <Text style={{ fontSize: 12, color: "#4ADE80" }}>
                  {copiedSection === "capabilities" ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: "#86EFAC",
                marginBottom: 12,
                lineHeight: 20,
              }}
            >
              Your app needs these iOS capabilities:
            </Text>

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#E2E8F0",
                  fontFamily: "monospace",
                }}
              >
                {iosCapabilities}
              </Text>
            </View>
          </View>
        </View>

        {/* RevenueCat Dashboard Setup */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 16,
            }}
          >
            📱 RevenueCat Dashboard Setup
          </Text>

          <View
            style={{
              backgroundColor: "rgba(251, 191, 36, 0.1)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#FCD34D",
                }}
              >
                Setup Steps
              </Text>
              <TouchableOpacity
                onPress={() =>
                  copyToClipboard(revenueCatSetupSteps, "revenuecat")
                }
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy size={14} color="#FCD34D" />
                <Text style={{ fontSize: 12, color: "#FCD34D" }}>
                  {copiedSection === "revenuecat" ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#FEF3C7",
                  fontFamily: "monospace",
                  lineHeight: 20,
                }}
              >
                {revenueCatSetupSteps}
              </Text>
            </View>
          </View>
        </View>

        {/* App Store Connect Setup */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginBottom: 16,
            }}
          >
            🍎 App Store Connect Setup
          </Text>

          <View
            style={{
              backgroundColor: "rgba(236, 72, 153, 0.1)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#F9A8D4",
                }}
              >
                Setup Steps
              </Text>
              <TouchableOpacity
                onPress={() =>
                  copyToClipboard(appStoreConnectSteps, "appstore")
                }
                style={{
                  backgroundColor: "rgba(236, 72, 153, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Copy size={14} color="#F9A8D4" />
                <Text style={{ fontSize: 12, color: "#F9A8D4" }}>
                  {copiedSection === "appstore" ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#FCE7F3",
                  fontFamily: "monospace",
                  lineHeight: 20,
                }}
              >
                {appStoreConnectSteps}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary / Next Steps */}
        <View
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            borderColor: "rgba(59, 130, 246, 0.3)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#60A5FA",
              marginBottom: 12,
            }}
          >
            📋 Summary
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#93C5FD",
              lineHeight: 22,
              marginBottom: 12,
            }}
          >
            If RevenueCat isn't working in your TestFlight build, it's most
            likely because the{" "}
            <Text style={{ fontWeight: "700" }}>Expo config plugin</Text> is
            missing from app.json.
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#93C5FD",
              lineHeight: 22,
              marginBottom: 12,
            }}
          >
            Since you're using the Anything platform, you'll need to contact the
            Anything team to add this plugin to your build configuration.
          </Text>

          <View
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.2)",
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#DBEAFE",
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              💬 What to tell the Anything team:
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#DBEAFE",
                lineHeight: 20,
              }}
            >
              "My app needs the react-native-purchases Expo config plugin added
              to app.json for RevenueCat to work in EAS builds. The plugin
              section should include 'react-native-purchases' with the
              appropriate iOS configuration."
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
