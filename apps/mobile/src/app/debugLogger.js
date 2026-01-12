import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_LOGS = 100; // Keep last 100 operations
const STORAGE_KEY = "@debug_logs";

/**
 * Debug logger for tracking all add/delete operations in production
 */
class DebugLogger {
  constructor() {
    this.logs = [];
    this.listeners = new Set();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to load debug logs:", error);
      this.logs = [];
      this.initialized = true;
    }
  }

  async saveLogs() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error("Failed to save debug logs:", error);
    }
  }

  /**
   * Log an add/delete operation
   */
  async log(type, data) {
    await this.init();

    const logEntry = {
      id: Date.now() + Math.random(),
      type, // 'add' or 'delete'
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.logs.unshift(logEntry);

    // Keep only last MAX_LOGS entries
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    await this.saveLogs();
    this.notifyListeners();

    return logEntry;
  }

  /**
   * Update an existing log entry (for async operations)
   */
  async updateLog(id, updates) {
    await this.init();

    const index = this.logs.findIndex((log) => log.id === id);
    if (index !== -1) {
      this.logs[index] = {
        ...this.logs[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await this.saveLogs();
      this.notifyListeners();
    }
  }

  /**
   * Get all logs
   */
  async getLogs() {
    await this.init();
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    this.logs = [];
    await this.saveLogs();
    this.notifyListeners();
  }

  /**
   * Subscribe to log changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => callback([...this.logs]));
  }

  /**
   * Get diagnostic info
   */
  async getDiagnostics() {
    const baseUrl =
      process.env.EXPO_PUBLIC_PROXY_BASE_URL ||
      process.env.EXPO_PUBLIC_BASE_URL;
    const isHttps = baseUrl?.startsWith("https://");

    let environment = "unknown";
    if (baseUrl?.includes("localhost") || baseUrl?.includes("127.0.0.1")) {
      environment = "dev";
    } else if (baseUrl?.includes("staging") || baseUrl?.includes("preview")) {
      environment = "staging";
    } else {
      environment = "prod";
    }

    return {
      baseUrl,
      isHttps,
      environment,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

/**
 * Helper to log add water operation
 */
export async function logAddWater(payload, options = {}) {
  const diagnostics = await debugLogger.getDiagnostics();

  return await debugLogger.log("add", {
    action: "add_water",
    payload,
    url: `${diagnostics.baseUrl}/api/water-today`,
    method: "POST",
    environment: diagnostics.environment,
    isHttps: diagnostics.isHttps,
    ...options,
  });
}

/**
 * Helper to log delete water operation
 */
export async function logDeleteWater(entryId, options = {}) {
  const diagnostics = await debugLogger.getDiagnostics();

  return await debugLogger.log("delete", {
    action: "delete_water",
    entryId,
    url: `${diagnostics.baseUrl}/api/water-entry/${entryId}`,
    method: "DELETE",
    environment: diagnostics.environment,
    isHttps: diagnostics.isHttps,
    ...options,
  });
}
