import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { debugLogger } from "@/app/debugLogger";

/**
 * Query keys for water data
 */
export const waterQueryKeys = {
  today: (date) => ["water", "today", date],
  history: () => ["water", "history"],
  dayDetails: (date) => ["water", "day", date],
  weeklySummary: (weekStart) => ["water", "weekly", weekStart],
};

/**
 * Log refetch events to debug console
 */
async function logRefetch(action, page, timestamp = new Date().toISOString()) {
  try {
    const logs = await AsyncStorage.getItem("refetchLogs");
    const logArray = logs ? JSON.parse(logs) : [];

    logArray.unshift({
      action,
      page,
      timestamp,
      id: `${timestamp}-${Math.random()}`,
    });

    // Keep only last 100 logs
    if (logArray.length > 100) {
      logArray.splice(100);
    }

    await AsyncStorage.setItem("refetchLogs", JSON.stringify(logArray));
    console.log(`🔄 REFETCH LOG: [${action}] ${page} at ${timestamp}`);
  } catch (error) {
    console.error("Failed to log refetch:", error);
  }
}

/**
 * Get refetch logs for debug console
 */
export async function getRefetchLogs() {
  try {
    const logs = await AsyncStorage.getItem("refetchLogs");
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error("Failed to get refetch logs:", error);
    return [];
  }
}

/**
 * Clear refetch logs
 */
export async function clearRefetchLogs() {
  try {
    await AsyncStorage.removeItem("refetchLogs");
    console.log("✅ Cleared refetch logs");
  } catch (error) {
    console.error("Failed to clear refetch logs:", error);
  }
}

/**
 * Fetch today's water entries and total - ALWAYS FRESH
 */
async function fetchTodayWater(date) {
  await logRefetch(
    "FETCH",
    "Track Page (Today's Water)",
    new Date().toISOString(),
  );

  const response = await fetchWithAuth(
    `/api/water-today?date=${date}&_fresh=${Date.now()}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch water data");
  }

  const data = await response.json();

  // Process entries with cumulative total
  let cumulative = 0;
  const processedEntries = (data.entries || []).map((entry) => {
    cumulative += parseFloat(entry.ounces) || 0;
    return {
      ...entry,
      cumulativeTotal: cumulative,
    };
  });

  return {
    total: parseFloat(data.total) || 0,
    entries: processedEntries,
  };
}

/**
 * Delete a water entry with retry logic
 */
async function deleteWaterEntry(entryId, attempt = 1) {
  const startTime = Date.now();
  let logId = null;

  try {
    // Log the delete attempt
    logId = (
      await debugLogger.log("delete", {
        action: "delete_water",
        entryId,
        url: `/api/water-entry/${entryId}`,
        method: "DELETE",
        status: "pending",
        attempt,
      })
    ).id;

    const response = await fetchWithAuth(`/api/water-entry/${entryId}`, {
      method: "DELETE",
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.json();

      // Update log with error
      await debugLogger.updateLog(logId, {
        status: "error",
        statusCode: response.status,
        statusText: response.statusText,
        error: error.error || "Unknown error",
        duration,
      });

      // Authentication errors - don't retry
      if (response.status === 401) {
        const authError = new Error(
          "Your session has expired. Please sign in again.",
        );
        authError.isAuthError = true;
        authError.statusCode = 401;
        throw authError;
      }

      // Not found errors - entry doesn't exist
      if (response.status === 404) {
        const notFoundError = new Error(
          "This entry no longer exists or has already been deleted.",
        );
        notFoundError.isNotFoundError = true;
        notFoundError.statusCode = 404;
        throw notFoundError;
      }

      // Server errors - these might be retriable
      if (response.status >= 500) {
        const serverError = new Error(
          error.error ||
            "The server is having trouble right now. Please try again in a moment.",
        );
        serverError.isServerError = true;
        serverError.statusCode = response.status;
        throw serverError;
      }

      // Database errors - check for specific messages
      if (error.error && error.error.includes("database")) {
        const dbError = new Error("Database error: " + error.error);
        dbError.isDatabaseError = true;
        dbError.statusCode = response.status;
        throw dbError;
      }

      // Generic error with server message
      const genericError = new Error(
        error.error || `Server error (${response.status})`,
      );
      genericError.statusCode = response.status;
      throw genericError;
    }

    const result = await response.json();

    // Update log with success
    await debugLogger.updateLog(logId, {
      status: "success",
      statusCode: response.status,
      statusText: response.statusText,
      response: result,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Network errors - no response received
    if (
      error.name === "TypeError" ||
      error.message === "Network request failed"
    ) {
      const networkError = new Error(
        "No internet connection. Please check your WiFi or cellular data.",
      );
      networkError.isNetworkError = true;

      if (logId) {
        await debugLogger.updateLog(logId, {
          status: "error",
          error: networkError.message,
          duration,
        });
      }

      throw networkError;
    }

    // Don't retry auth errors or not found errors
    if (error.isAuthError || error.isNotFoundError) {
      throw error;
    }

    // Retry server errors and other errors up to 2 more times (3 total attempts)
    if (attempt < 3) {
      console.log(`Delete attempt ${attempt} failed, retrying...`);

      if (logId) {
        await debugLogger.updateLog(logId, {
          status: "retrying",
          error: error.message,
          nextAttempt: attempt + 1,
          duration,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      return deleteWaterEntry(entryId, attempt + 1);
    }

    // Max retries reached - enhance error message
    if (
      !error.isNetworkError &&
      !error.isDatabaseError &&
      !error.isServerError
    ) {
      error.message = `Failed after ${attempt} attempts: ${error.message}`;
    }

    if (logId) {
      await debugLogger.updateLog(logId, {
        status: "error",
        error: error.message,
        maxRetriesReached: true,
        duration,
      });
    }

    throw error;
  }
}

/**
 * Add water entry with retry logic
 */
async function addWaterEntry(payload, attempt = 1) {
  const startTime = Date.now();
  let logId = null;

  try {
    // Log the add attempt
    logId = (
      await debugLogger.log("add", {
        action: "add_water",
        payload,
        url: "/api/water-today",
        method: "POST",
        status: "pending",
        attempt,
      })
    ).id;

    const response = await fetchWithAuth("/api/water-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;

    // Check content type before parsing
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!response.ok) {
      let error;

      // If it's not JSON, read as text and create a better error message
      if (!isJson) {
        const textResponse = await response.text();
        const isHtml =
          textResponse.trim().startsWith("<!DOCTYPE") ||
          textResponse.trim().startsWith("<html");

        const errorMessage = isHtml
          ? `Server returned ${response.status} error page (HTML) instead of JSON. This usually means there's a server error. Please try again or contact support if this continues.`
          : `Server returned ${response.status} with non-JSON response: ${textResponse.substring(0, 200)}`;

        error = { error: errorMessage };

        console.error(`[ADD WATER] Non-JSON response:`, {
          status: response.status,
          contentType,
          isHtml,
          preview: textResponse.substring(0, 300),
        });
      } else {
        error = await response.json();
      }

      // Update log with error
      await debugLogger.updateLog(logId, {
        status: "error",
        statusCode: response.status,
        statusText: response.statusText,
        error: error.error || "Unknown error",
        duration,
      });

      // Check for daily limit errors - don't retry these
      if (response.status === 429 && error.limitExceeded) {
        const limitError = new Error(error.error || "Daily limit reached");
        limitError.isLimitError = true;
        limitError.statusCode = 429;
        throw limitError;
      }

      // Authentication errors - don't retry
      if (response.status === 401) {
        const authError = new Error(
          "Your session has expired. Please sign in again.",
        );
        authError.isAuthError = true;
        authError.statusCode = 401;
        throw authError;
      }

      // Server errors - these might be retriable
      if (response.status >= 500) {
        const serverError = new Error(
          error.error ||
            "The server is having trouble right now. Please try again in a moment.",
        );
        serverError.isServerError = true;
        serverError.statusCode = response.status;
        throw serverError;
      }

      // Database errors - check for specific messages
      if (error.error && error.error.includes("database")) {
        const dbError = new Error("Database error: " + error.error);
        dbError.isDatabaseError = true;
        dbError.statusCode = response.status;
        throw dbError;
      }

      // Generic error with server message
      const genericError = new Error(
        error.error || `Server error (${response.status})`,
      );
      genericError.statusCode = response.status;
      throw genericError;
    }

    const result = await response.json();

    // Update log with success
    await debugLogger.updateLog(logId, {
      status: "success",
      statusCode: response.status,
      statusText: response.statusText,
      response: result,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Network errors - no response received
    if (
      error.name === "TypeError" ||
      error.message === "Network request failed"
    ) {
      const networkError = new Error(
        "No internet connection. Please check your WiFi or cellular data.",
      );
      networkError.isNetworkError = true;

      if (logId) {
        await debugLogger.updateLog(logId, {
          status: "error",
          error: networkError.message,
          duration,
        });
      }

      throw networkError;
    }

    // Don't retry limit errors or auth errors
    if (error.isLimitError || error.isAuthError) {
      throw error;
    }

    // Retry server errors and other errors up to 2 more times (3 total attempts)
    if (attempt < 3) {
      console.log(`Add attempt ${attempt} failed, retrying...`);

      if (logId) {
        await debugLogger.updateLog(logId, {
          status: "retrying",
          error: error.message,
          nextAttempt: attempt + 1,
          duration,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      return addWaterEntry(payload, attempt + 1);
    }

    // Max retries reached - enhance error message
    if (
      !error.isNetworkError &&
      !error.isDatabaseError &&
      !error.isServerError
    ) {
      error.message = `Failed after ${attempt} attempts: ${error.message}`;
    }

    if (logId) {
      await debugLogger.updateLog(logId, {
        status: "error",
        error: error.message,
        maxRetriesReached: true,
        duration,
      });
    }

    throw error;
  }
}

/**
 * Hook for today's water data - ALWAYS FETCH FRESH FROM DB
 */
export function useTodayWater(date) {
  const query = useQuery({
    queryKey: waterQueryKeys.today(date),
    queryFn: () => fetchTodayWater(date),
    staleTime: 0, // Always stale - refetch on every mount
    cacheTime: 0, // No caching - always fetch fresh
    refetchOnMount: "always", // Force refetch on mount
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    total: query.data?.total || 0,
    entries: query.data?.entries || [],
  };
}

/**
 * Hook for adding water - WITH OPTIMISTIC UPDATES for instant UI feedback
 */
export function useAddWater(currentDate) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ounces,
      classification,
      imageUrl,
      description,
      servings,
      liquidType,
      timestamp,
      createdFromFavorite,
    }) => {
      // Use time-travel adjusted date from parameter (allows testing day-dependent behavior)
      const now = new Date();
      const entryTimestamp = timestamp || now.toISOString();

      console.log("💧 Saving water to database...");
      console.log(`   Entry date (time-travel adjusted): ${currentDate}`);
      console.log(`   Timestamp: ${entryTimestamp}`);

      return addWaterEntry({
        ounces: parseFloat(ounces),
        entry_date: currentDate, // Use time-travel adjusted date from parameter
        timestamp: entryTimestamp,
        classification: classification,
        image_url: imageUrl,
        description: description,
        servings: servings || 1,
        liquid_type: liquidType || "water",
        created_from_favorite: createdFromFavorite || false,
      });
    },

    // 🚀 OPTIMISTIC UPDATE: Update UI immediately before API call completes
    onMutate: async (variables) => {
      console.log("⚡ OPTIMISTIC UPDATE: Updating UI immediately...");

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: waterQueryKeys.today(currentDate),
      });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData(
        waterQueryKeys.today(currentDate),
      );

      // Optimistically update the cache
      queryClient.setQueryData(waterQueryKeys.today(currentDate), (old) => {
        if (!old) {
          // If no data yet, create initial structure
          return {
            total: parseFloat(variables.ounces),
            entries: [
              {
                id: "optimistic-" + Date.now(), // Temporary ID
                ounces: parseFloat(variables.ounces),
                timestamp: variables.timestamp || new Date().toISOString(),
                classification: variables.classification,
                liquid_type: variables.liquidType || "water",
                image_url: variables.imageUrl,
                cumulativeTotal: parseFloat(variables.ounces),
              },
            ],
          };
        }

        // Add new entry to existing data
        const newOunces = parseFloat(variables.ounces);
        const newTotal = (old.total || 0) + newOunces;

        // Calculate cumulative total for new entry
        const cumulativeTotal = newTotal;

        const newEntry = {
          id: "optimistic-" + Date.now(), // Temporary ID until server responds
          ounces: newOunces,
          timestamp: variables.timestamp || new Date().toISOString(),
          classification: variables.classification,
          liquid_type: variables.liquidType || "water",
          image_url: variables.imageUrl,
          cumulativeTotal: cumulativeTotal,
        };

        return {
          total: newTotal,
          entries: [...(old.entries || []), newEntry],
        };
      });

      console.log("✅ OPTIMISTIC UPDATE: UI updated instantly!");

      // Return context with previous data for rollback
      return { previousData };
    },

    onError: (error, variables, context) => {
      console.error("❌ Add water failed:", error);

      // 🔄 ROLLBACK: Restore previous state if mutation fails
      if (context?.previousData) {
        console.log("⏪ ROLLBACK: Reverting optimistic update...");
        queryClient.setQueryData(
          waterQueryKeys.today(currentDate),
          context.previousData,
        );
        console.log("✅ ROLLBACK: UI reverted to previous state");
      }

      // 🔄 FORCE REFETCH: After user dismisses alert, pull fresh data from DB
      const forceRefresh = async () => {
        console.log("🔄 Force refreshing from database after error...");
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.today(currentDate),
          type: "active",
        });
        console.log("✅ Data refreshed from database");
      };

      // Show specific error based on error type
      if (error.isLimitError) {
        Alert.alert("Daily Limit Reached", error.message, [
          {
            text: "OK",
            onPress: forceRefresh, // Force refresh when user presses OK
          },
        ]);
      } else if (error.isAuthError) {
        Alert.alert("Session Expired", error.message);
      } else if (error.isNetworkError) {
        Alert.alert("No Internet Connection", error.message);
      } else if (error.isServerError) {
        Alert.alert("Server Error", error.message);
      } else if (error.isDatabaseError) {
        Alert.alert(
          "Database Error",
          "There was a problem saving to the database. Please try again or contact support if this continues.",
        );
      } else {
        Alert.alert(
          "Couldn't Add Water",
          error.message || "An unexpected error occurred. Please try again.",
        );
      }
    },

    onSuccess: async (data) => {
      const timestamp = new Date().toISOString();
      console.log("✅ Water saved to database successfully");
      console.log("🔄 ========================================");
      console.log("🔄 PERFORMING FULL HARD REFETCH OF ALL PAGES");
      console.log("🔄 ========================================");

      // FULL HARD REFETCH - Force re-pull ALL data from server to replace optimistic data with real data
      try {
        await logRefetch("ADD", "Track Page", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.today(currentDate),
          type: "active",
        });
        console.log(
          "✅ Track Page refetched from DB (replaced optimistic data with real data)",
        );

        await logRefetch("ADD", "History Page", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.history(),
          type: "active",
        });
        console.log("✅ History Page refetched from DB");

        await logRefetch("ADD", "Day Details (Entry Page)", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.dayDetails(currentDate),
          type: "active",
        });
        console.log("✅ Day Details refetched from DB");

        console.log("🔄 ========================================");
        console.log("✅ FULL HARD REFETCH COMPLETE");
        console.log("🔄 All UI updated from fresh DB data");
        console.log("🔄 ========================================");
      } catch (error) {
        console.error("❌ Error during refetch:", error);
      }
    },
  });
}

/**
 * Hook for deleting water entries - WITH OPTIMISTIC UPDATES for instant UI feedback
 */
export function useDeleteWaterEntry(currentDate) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId) => {
      // Check if this is an optimistic entry (not yet saved to DB)
      if (typeof entryId === "string" && entryId.startsWith("optimistic-")) {
        const error = new Error(
          "This entry is still being saved. Please wait a moment and try again.",
        );
        error.isOptimisticEntry = true;
        throw error;
      }

      console.log("🗑️ Soft deleting entry in database...");
      return deleteWaterEntry(entryId);
    },

    // 🚀 OPTIMISTIC UPDATE: Update UI immediately before API call completes
    onMutate: async (entryId) => {
      // Check if this is an optimistic entry
      if (typeof entryId === "string" && entryId.startsWith("optimistic-")) {
        console.log("⚠️ Cannot delete optimistic entry - not yet saved to DB");
        return { previousData: null }; // Return empty context
      }

      console.log(
        "⚡ OPTIMISTIC DELETE: Removing entry from UI immediately...",
      );

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: waterQueryKeys.today(currentDate),
      });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueryData(
        waterQueryKeys.today(currentDate),
      );

      // Optimistically remove the entry from the cache
      queryClient.setQueryData(waterQueryKeys.today(currentDate), (old) => {
        if (!old) return old;

        // Find the entry to delete and calculate the ounces to subtract
        const entryToDelete = old.entries?.find(
          (entry) => entry.id === entryId,
        );
        if (!entryToDelete) return old;

        const ouncesToSubtract = parseFloat(entryToDelete.ounces) || 0;
        const newTotal = Math.max(0, (old.total || 0) - ouncesToSubtract);

        // Remove the entry from the list
        const newEntries = (old.entries || []).filter(
          (entry) => entry.id !== entryId,
        );

        // Recalculate cumulative totals for remaining entries
        let cumulative = 0;
        const recalculatedEntries = newEntries.map((entry) => {
          cumulative += parseFloat(entry.ounces) || 0;
          return {
            ...entry,
            cumulativeTotal: cumulative,
          };
        });

        return {
          total: newTotal,
          entries: recalculatedEntries,
        };
      });

      console.log("✅ OPTIMISTIC DELETE: Entry removed from UI instantly!");

      // Return context with previous data for rollback
      return { previousData };
    },

    onError: (error, variables, context) => {
      console.error("❌ Delete failed:", error);

      // 🔄 ROLLBACK: Restore previous state if mutation fails
      if (context?.previousData) {
        console.log("⏪ ROLLBACK: Reverting optimistic delete...");
        queryClient.setQueryData(
          waterQueryKeys.today(currentDate),
          context.previousData,
        );
        console.log("✅ ROLLBACK: UI reverted to previous state");
      }

      // Show specific error based on error type
      if (error.isOptimisticEntry) {
        Alert.alert("Entry Still Saving", error.message);
      } else if (error.isAuthError) {
        Alert.alert("Session Expired", error.message);
      } else if (error.isNotFoundError) {
        Alert.alert("Entry Not Found", error.message);
      } else if (error.isNetworkError) {
        Alert.alert("No Internet Connection", error.message);
      } else if (error.isServerError) {
        Alert.alert("Server Error", error.message);
      } else if (error.isDatabaseError) {
        Alert.alert(
          "Database Error",
          "There was a problem deleting from the database. Please try again or contact support if this continues.",
        );
      } else {
        Alert.alert(
          "Couldn't Delete Entry",
          error.message || "An unexpected error occurred. Please try again.",
        );
      }

      // Re-throw so component can handle it too
      throw error;
    },

    onSuccess: async () => {
      const timestamp = new Date().toISOString();
      console.log("✅ Entry soft deleted from database successfully");
      console.log("🔄 ========================================");
      console.log("🔄 PERFORMING FULL HARD REFETCH OF ALL PAGES");
      console.log("🔄 ========================================");

      // FULL HARD REFETCH - Force re-pull ALL data from server to replace optimistic data with real data
      try {
        await logRefetch("DELETE", "Track Page", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.today(currentDate),
          type: "active",
        });
        console.log(
          "✅ Track Page refetched from DB (replaced optimistic data with real data)",
        );

        await logRefetch("DELETE", "History Page", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.history(),
          type: "active",
        });
        console.log("✅ History Page refetched from DB");

        await logRefetch("DELETE", "Day Details (Entry Page)", timestamp);
        await queryClient.refetchQueries({
          queryKey: waterQueryKeys.dayDetails(currentDate),
          type: "active",
        });
        console.log("✅ Day Details refetched from DB");

        console.log("🔄 ========================================");
        console.log("✅ FULL HARD REFETCH COMPLETE");
        console.log("🔄 All UI updated from fresh DB data");
        console.log("🔄 ========================================");
      } catch (error) {
        console.error("❌ Error during refetch:", error);
      }
    },
  });
}

/**
 * Hook for fetching water history - ALWAYS FETCH FRESH FROM DB
 */
export function useWaterHistory(enabled = true) {
  return useQuery({
    queryKey: waterQueryKeys.history(),
    queryFn: async () => {
      await logRefetch("FETCH", "History Page", new Date().toISOString());
      console.log("📊 Fetching history from database...");

      const response = await fetchWithAuth(
        `/api/water-history?_fresh=${Date.now()}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch history");
      }

      const data = await response.json();
      console.log("✅ History fetched from database");

      // Return full data including goal ranges
      return {
        history: data.history || [],
        goalRanges: data.goalRanges || [],
        defaultGoal: data.defaultGoal || 64,
      };
    },
    staleTime: 0, // Always stale - refetch on every mount
    cacheTime: 0, // No caching - always fetch fresh
    refetchOnMount: "always", // Force refetch on mount
    refetchOnWindowFocus: false,
    enabled: enabled,
  });
}

/**
 * Hook for fetching day details - ALWAYS FETCH FRESH FROM DB (NO CACHE)
 */
export function useDayDetails(date, options = {}) {
  return useQuery({
    queryKey: waterQueryKeys.dayDetails(date),
    queryFn: async () => {
      await logRefetch(
        "FETCH",
        "Day Details (Entry Page)",
        new Date().toISOString(),
      );
      console.log("📅 Fetching day details from database for:", date);

      const response = await fetchWithAuth(
        `/api/day-details?date=${date}&_fresh=${Date.now()}`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch day details");
      }

      const data = await response.json();
      console.log("✅ Day details fetched from database");

      return {
        entries: data.entries || [],
        isHistorical: data.isHistorical || false,
        dailyTotal: data.dailyTotal || 0,
        message: data.message,
      };
    },
    staleTime: 0, // Always stale - refetch on every mount
    cacheTime: 0, // No caching - always fetch fresh from DB
    refetchOnMount: "always", // Force refetch on mount
    refetchOnWindowFocus: false,
    enabled: options.enabled !== undefined ? options.enabled : true,
  });
}
