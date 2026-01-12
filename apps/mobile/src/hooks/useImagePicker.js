import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";

export function useImagePicker() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCustomCamera, setShowCustomCamera] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true, // Get base64 data directly
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      return result.assets[0];
    }
    return null;
  }, []);

  const takePhoto = useCallback(() => {
    setShowCustomCamera(true);
  }, []);

  const handleCameraCapture = useCallback((photo) => {
    setShowCustomCamera(false);
    setSelectedImage(photo);
  }, []);

  const handleCameraClose = useCallback(() => {
    setShowCustomCamera(false);
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  return {
    selectedImage,
    setSelectedImage,
    pickImage,
    takePhoto,
    clearImage,
    showCustomCamera,
    handleCameraCapture,
    handleCameraClose,
  };
}
