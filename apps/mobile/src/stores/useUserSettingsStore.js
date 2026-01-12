import { create } from "zustand";

// Global store for user settings to avoid redundant database queries
const useUserSettingsStore = create((set, get) => ({
  // Settings data
  dailyGoal: 64,
  handSize: "medium",
  sipSize: "medium",
  onboardingCompleted: false,
  notificationsEnabled: false,
  notificationTimes: "09:00,12:00,17:00", // 9am, 12pm, 5pm
  waterUnit: "oz",
  lastCleanupDate: null,

  // Debug time travel
  timeOffsetDays: 0,

  // Profile data
  gender: null,
  age: null,
  heightCm: null,
  weightKg: null,
  activityLevel: null,

  // Loading states
  isLoading: false,
  isInitialized: false,
  lastFetched: null,

  // Actions
  setSettings: (settings) =>
    set((state) => ({
      ...settings,
      lastFetched: Date.now(),
      isInitialized: true,
    })),

  updateSetting: (key, value) =>
    set((state) => ({
      [key]: value,
      lastFetched: Date.now(),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  // Time travel methods
  incrementTimeOffset: () =>
    set((state) => ({
      timeOffsetDays: state.timeOffsetDays + 1,
    })),

  resetTimeOffset: () =>
    set({
      timeOffsetDays: 0,
    }),

  getCurrentDate: () => {
    const state = get();
    const now = new Date();
    now.setDate(now.getDate() + state.timeOffsetDays);
    return now;
  },

  // Fetch settings from API
  fetchSettings: async () => {
    const state = get();

    // Don't fetch if we just fetched (within 30 seconds)
    if (state.lastFetched && Date.now() - state.lastFetched < 30000) {
      console.log("⚡ Using cached user settings (fresh)");
      return state;
    }

    set({ isLoading: true });

    try {
      // Don't pass date - we want the default/future goal for fallback
      // Individual components will fetch historical goals for specific dates
      const response = await fetch("/api/user-goal");
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();

      set({
        dailyGoal: parseFloat(data.dailyGoal) || 64,
        handSize: data.handSize || "medium",
        sipSize: data.sipSize || "medium",
        onboardingCompleted: data.onboardingCompleted || false,
        waterUnit: data.waterUnit || "oz",
        gender: data.gender,
        age: data.age,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        activityLevel: data.activityLevel,
        lastCleanupDate: data.lastCleanupDate || null,
        lastFetched: Date.now(),
        isInitialized: true,
        isLoading: false,
      });

      console.log("✓ Fetched user settings from API");
      return get();
    } catch (error) {
      console.error("Error fetching user settings:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Force refresh (ignores cache)
  forceRefresh: async () => {
    set({ lastFetched: null });
    return get().fetchSettings();
  },

  // Clear store (on logout)
  reset: () =>
    set({
      dailyGoal: 64,
      handSize: "medium",
      sipSize: "medium",
      onboardingCompleted: false,
      notificationsEnabled: false,
      notificationTimes: "09:00,12:00,17:00",
      waterUnit: "oz",
      lastCleanupDate: null,
      timeOffsetDays: 0,
      gender: null,
      age: null,
      heightCm: null,
      weightKg: null,
      activityLevel: null,
      isLoading: false,
      isInitialized: false,
      lastFetched: null,
    }),
}));

export default useUserSettingsStore;
