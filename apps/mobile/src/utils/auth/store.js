import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: async (auth) => {
    try {
      const timestamp = new Date().toISOString();

      // Reject old auth format with sessionToken instead of jwt
      const hasSessionToken = auth && "sessionToken" in auth;
      const hasJWT = auth && "jwt" in auth;

      if (hasSessionToken && !hasJWT) {
        console.error(
          `[AUTH STORE ${timestamp}] ⚠️ Rejecting old auth format with sessionToken - clearing`,
          {
            authKeys: Object.keys(auth),
          },
        );
        // Clear the old data
        await SecureStore.deleteItemAsync(authKey);
        set({ auth: null, isReady: true });
        return;
      }

      console.log(`[AUTH STORE ${timestamp}] setAuth called`, {
        hasAuth: !!auth,
        hasJWT: !!auth?.jwt,
        jwtLength: auth?.jwt?.length,
        jwtPreview: auth?.jwt ? auth.jwt.substring(0, 20) + "..." : "NO JWT",
        userId: auth?.user?.id,
        userEmail: auth?.user?.email,
        authKeys: auth ? Object.keys(auth) : [],
      });

      if (auth) {
        // First clear any existing auth to prevent race conditions
        await SecureStore.deleteItemAsync(authKey);
        console.log(`[AUTH STORE ${timestamp}] Cleared old SecureStore data`);

        // Convert to string for storage
        const authString = JSON.stringify(auth);
        console.log(`[AUTH STORE ${timestamp}] Stringified auth data:`, {
          length: authString.length,
          preview: authString.substring(0, 150) + "...",
        });

        // Then set the new auth
        await SecureStore.setItemAsync(authKey, authString);
        console.log(`[AUTH STORE ${timestamp}] Saved new auth to SecureStore`, {
          userId: auth.user?.id,
          hasJWT: !!auth.jwt,
        });

        // Verify it was saved
        const saved = await SecureStore.getItemAsync(authKey);
        const parsed = saved ? JSON.parse(saved) : null;
        console.log(
          `[AUTH STORE ${timestamp}] Verification - loaded from SecureStore:`,
          {
            hasSaved: !!saved,
            hasParsed: !!parsed,
            hasJWT: !!parsed?.jwt,
            jwtLength: parsed?.jwt?.length,
            userId: parsed?.user?.id,
            jwtMatch: parsed?.jwt === auth.jwt,
          },
        );
      } else {
        await SecureStore.deleteItemAsync(authKey);
        console.log(`[AUTH STORE ${timestamp}] Deleted auth from SecureStore`);
      }

      // Update Zustand state
      set({ auth });
      console.log(`[AUTH STORE ${timestamp}] Updated Zustand state`, {
        userId: auth?.user?.id,
        hasJWT: !!auth?.jwt,
      });

      // Verify Zustand state after update
      setTimeout(() => {
        const stateAfter = useAuthStore.getState();
        console.log(`[AUTH STORE ${timestamp}] Zustand state verified:`, {
          hasAuth: !!stateAfter.auth,
          hasJWT: !!stateAfter.auth?.jwt,
          jwtLength: stateAfter.auth?.jwt?.length,
          userId: stateAfter.auth?.user?.id,
        });
      }, 0);
    } catch (error) {
      console.error(`[AUTH STORE ERROR] Error setting auth:`, error);
      set({ auth: null });
    }
  },
  clearAuth: async () => {
    try {
      const timestamp = new Date().toISOString();
      console.log(
        `[AUTH STORE ${timestamp}] clearAuth called - starting cleanup`,
      );

      // Clear SecureStore
      await SecureStore.deleteItemAsync(authKey);
      console.log(`[AUTH STORE ${timestamp}] ✓ SecureStore cleared`);

      // Clear Zustand state
      set({ auth: null });
      console.log(`[AUTH STORE ${timestamp}] ✓ Zustand state cleared`);

      console.log(
        `[AUTH STORE ${timestamp}] ✓ clearAuth completed successfully`,
      );
    } catch (error) {
      console.error(`[AUTH STORE ERROR] Error clearing auth:`, error);
      // Force clear state even if SecureStore fails
      set({ auth: null });
    }
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "signup",
  open: (options) => {
    const timestamp = new Date().toISOString();
    const mode = options?.mode || "signup";
    console.log(`[AUTH MODAL ${timestamp}] Opening modal`, { mode });
    set({ isOpen: true, mode });
  },
  close: () => {
    const timestamp = new Date().toISOString();
    console.log(`[AUTH MODAL ${timestamp}] Closing modal`);
    set({ isOpen: false });
  },
}));
