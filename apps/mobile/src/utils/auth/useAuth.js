import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { Modal, View } from "react-native";
import { useAuthModal, useAuthStore, authKey } from "./store";
import useUserSettingsStore from "@/stores/useUserSettingsStore";
import { clearAllCaches } from "@/utils/dataCache";

/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth, clearAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();

  const initiate = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.log(
      `[USE AUTH ${timestamp}] initiate() called - loading from SecureStore`,
    );

    SecureStore.getItemAsync(authKey).then((authString) => {
      console.log(`[USE AUTH ${timestamp}] Loaded from SecureStore:`, {
        hasData: !!authString,
        length: authString?.length,
        preview: authString?.substring(0, 100),
      });

      const auth = authString ? JSON.parse(authString) : null;

      console.log(`[USE AUTH ${timestamp}] Parsed auth:`, {
        hasAuth: !!auth,
        hasJWT: !!auth?.jwt,
        userId: auth?.user?.id,
        authKeys: auth ? Object.keys(auth) : [],
      });

      // Validate auth format - reject old sessionToken format
      const hasSessionToken = auth && "sessionToken" in auth;
      const hasJWT = auth && "jwt" in auth;

      if (hasSessionToken && !hasJWT) {
        console.error(
          `[USE AUTH ${timestamp}] Found old auth with sessionToken - clearing`,
        );
        // Clear the invalid auth
        SecureStore.deleteItemAsync(authKey);
        useAuthStore.setState({
          auth: null,
          isReady: true,
        });
        console.log(
          `[USE AUTH ${timestamp}] Old auth cleared, user needs to sign in again`,
        );
        return;
      }

      useAuthStore.setState({
        auth: auth,
        isReady: true,
      });

      console.log(`[USE AUTH ${timestamp}] Auth state initialized`);
    });
  }, []);

  useEffect(() => {}, []);

  const signIn = useCallback(() => {
    open({ mode: "signin" });
  }, [open]);

  const signUp = useCallback(() => {
    open({ mode: "signup" });
  }, [open]);

  const signOut = useCallback(async () => {
    const timestamp = new Date().toISOString();
    console.log(`[USE AUTH ${timestamp}] signOut called - starting cleanup`);

    try {
      // Clear auth from SecureStore and Zustand
      await clearAuth();
      console.log(`[USE AUTH ${timestamp}] Auth cleared from SecureStore`);

      // Reset user settings store
      useUserSettingsStore.getState().reset();
      console.log(`[USE AUTH ${timestamp}] User settings store reset`);

      // Clear all caches
      await clearAllCaches();
      console.log(`[USE AUTH ${timestamp}] All caches cleared`);

      close();
      console.log(`[USE AUTH ${timestamp}] Sign out complete`);
    } catch (error) {
      console.error(`[USE AUTH ${timestamp}] Error during sign out:`, error);
      // Still clear auth even if other steps fail
      await clearAuth();
      close();
    }
  }, [clearAuth, close]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;
