import { create } from "zustand";

const useCooldownStore = create((set, get) => ({
  lastAddTimestamp: null,

  // Check if cooldown period has passed (5 seconds)
  canAdd: () => {
    const { lastAddTimestamp } = get();
    if (!lastAddTimestamp) return true;

    const now = Date.now();
    const timeSinceLastAdd = now - lastAddTimestamp;
    const cooldownMs = 5000; // 5 seconds

    return timeSinceLastAdd >= cooldownMs;
  },

  // Get remaining cooldown time in seconds
  getRemainingCooldown: () => {
    const { lastAddTimestamp } = get();
    if (!lastAddTimestamp) return 0;

    const now = Date.now();
    const timeSinceLastAdd = now - lastAddTimestamp;
    const cooldownMs = 5000; // 5 seconds
    const remaining = Math.max(0, cooldownMs - timeSinceLastAdd);

    return Math.ceil(remaining / 1000); // Return in seconds
  },

  // Record that an add operation just happened
  recordAdd: () => {
    set({ lastAddTimestamp: Date.now() });
  },

  // Reset cooldown (useful for testing or edge cases)
  reset: () => {
    set({ lastAddTimestamp: null });
  },
}));

export default useCooldownStore;
