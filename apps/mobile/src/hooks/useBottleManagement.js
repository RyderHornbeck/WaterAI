import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

export function useBottleManagement() {
  const [bottles, setBottles] = useState([]);
  const [showCustomCamera, setShowCustomCamera] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);

  const pickImage = () => {
    setShowImageSourceModal(true);
  };

  const handleUseCamera = () => {
    setShowImageSourceModal(false);
    setShowCustomCamera(true);
  };

  const handleUseCameraRoll = async () => {
    setShowImageSourceModal(false);

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to add bottle images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newBottle = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        ounces: "",
      };
      setBottles([...bottles, newBottle]);
    }
  };

  const checkForDuplicateBottle = async (newBottleUri, existingBottle) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        newBottleUri,
        [{ resize: { width: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(",")[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const existingManipResult = await ImageManipulator.manipulateAsync(
        existingBottle.uri,
        [{ resize: { width: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );

      const existingResponse = await fetch(existingManipResult.uri);
      const existingBlob = await existingResponse.blob();

      const existingBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(",")[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(existingBlob);
      });

      const matchPrompt = `Compare these two images of water bottles/cups. Are they the SAME bottle/cup (same brand, size, design)?

Answer with ONLY "YES" if they are clearly the same bottle/cup, or "NO" if they are different bottles/cups.

Consider:
- Same brand/manufacturer
- Same size and shape
- Same design/color
- Same labels or markings

Just respond with YES or NO, nothing else.`;

      const matchResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: matchPrompt,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64}`,
                    },
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${existingBase64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 10,
          }),
        },
      );

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        const answer = matchData.choices[0].message.content
          .trim()
          .toUpperCase();

        if (answer.includes("YES")) {
          return existingBottle;
        }
      }
    } catch (error) {
      console.error("Error checking for duplicate bottles:", error);
    }
    return null;
  };

  const handleCameraCapture = async (photo) => {
    setShowCustomCamera(false);

    if (bottles.length > 0) {
      try {
        for (const existingBottle of bottles) {
          if (!existingBottle.uri) continue;

          const duplicate = await checkForDuplicateBottle(
            photo.uri,
            existingBottle,
          );

          if (duplicate) {
            Alert.alert(
              "Duplicate Bottle",
              `This looks like the same bottle you already added (${duplicate.ounces || "?"} oz). Skip adding it?`,
              [
                {
                  text: "Skip",
                  style: "cancel",
                },
                {
                  text: "Add Anyway",
                  onPress: () => {
                    const newBottle = {
                      id: Date.now().toString(),
                      uri: photo.uri,
                      ounces: duplicate.ounces || "",
                    };
                    setBottles([...bottles, newBottle]);
                  },
                },
              ],
            );
            return;
          }
        }
      } catch (error) {
        console.error("Error checking for duplicate bottles:", error);
      }
    }

    const newBottle = {
      id: Date.now().toString(),
      uri: photo.uri,
      ounces: "",
    };
    setBottles([...bottles, newBottle]);
  };

  const handleCameraClose = () => {
    setShowCustomCamera(false);
  };

  const updateBottleOunces = (bottleId, ounces) => {
    setBottles(bottles.map((b) => (b.id === bottleId ? { ...b, ounces } : b)));
  };

  const removeBottle = (bottleId) => {
    setBottles(bottles.filter((b) => b.id !== bottleId));
  };

  return {
    bottles,
    showCustomCamera,
    showImageSourceModal,
    setShowImageSourceModal,
    pickImage,
    handleUseCamera,
    handleUseCameraRoll,
    handleCameraCapture,
    handleCameraClose,
    updateBottleOunces,
    removeBottle,
  };
}
