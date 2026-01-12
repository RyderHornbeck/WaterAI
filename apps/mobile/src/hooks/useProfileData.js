import { useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getCache, setCache, CACHE_KEYS } from "@/utils/dataCache";

export function useProfileData() {
  const [profileData, setProfileData] = useState({
    gender: null,
    age: null,
    heightCm: null,
    weightKg: null,
    workoutsPerWeek: null,
    waterUnit: "oz",
  });

  const fetchProfileData = async () => {
    try {
      // Check cache first
      const cached = await getCache(CACHE_KEYS.USER_SETTINGS);
      if (cached !== null) {
        setProfileData({
          gender: cached.gender,
          age: cached.age,
          heightCm: cached.heightCm,
          weightKg: cached.weightKg,
          workoutsPerWeek: cached.workoutsPerWeek,
          waterUnit: cached.waterUnit || "oz",
        });
        return;
      }

      const response = await fetchWithAuth("/api/user-goal");
      if (!response.ok) throw new Error("Failed to fetch profile data");
      const data = await response.json();
      setProfileData({
        gender: data.gender,
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        workoutsPerWeek: data.workoutsPerWeek,
        waterUnit: data.waterUnit || "oz",
      });
      // Update cache
      await setCache(CACHE_KEYS.USER_SETTINGS, data);
    } catch (err) {
      console.error("Error fetching profile data:", err);
    }
  };

  const formatHeight = () => {
    if (!profileData.heightCm) return "Not set";

    if (profileData.waterUnit === "oz") {
      // Imperial: convert cm to feet and inches
      const totalInches = profileData.heightCm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    } else {
      // Metric
      return `${Math.round(profileData.heightCm)} cm`;
    }
  };

  const formatWeight = () => {
    if (!profileData.weightKg) return "Not set";

    if (profileData.waterUnit === "oz") {
      // Imperial: convert kg to lbs
      const lbs = Math.round(profileData.weightKg * 2.20462);
      return `${lbs} lbs`;
    } else {
      // Metric
      return `${Math.round(profileData.weightKg)} kg`;
    }
  };

  const formatActivityLevel = () => {
    if (!profileData.workoutsPerWeek) return "Not set";

    const activityLabels = {
      sedentary: "Sedentary (0-1 days/week)",
      light: "Light (2-3 days/week)",
      moderate: "Moderate (4-5 days/week)",
      active: "Active (6-7 days/week)",
    };

    return (
      activityLabels[profileData.workoutsPerWeek] || profileData.workoutsPerWeek
    );
  };

  const formatGender = () => {
    if (!profileData.gender) return "Not set";
    return (
      profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)
    );
  };

  return {
    profileData,
    fetchProfileData,
    formatHeight,
    formatWeight,
    formatActivityLevel,
    formatGender,
  };
}
