"use client";

import { useState, useEffect } from "react";

export default function DebugEnvPage() {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [serverEnvVars, setServerEnvVars] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingEnv, setLoadingEnv] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Client-side environment variables (only NEXT_PUBLIC_* are available)
  const clientEnvVars = {
    NODE_ENV: process.env.NODE_ENV || "Not set",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? "Set (hidden)"
      : "Not set",
  };

  // Browser info (client-side only)
  const browserInfo = {};
  if (typeof window !== "undefined") {
    browserInfo["window.location.origin"] = window.location.origin;
    browserInfo["window.location.href"] = window.location.href;
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Fetch server-side environment variables
  useEffect(() => {
    const fetchServerEnv = async () => {
      try {
        const response = await fetch("/api/debug-env");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data = await response.json();
        setServerEnvVars(data.envVars || data);
        setDiagnostics(data.diagnostics || null);
      } catch (error) {
        console.error("Error fetching server env:", error);
        setServerEnvVars({ error: error.message });
      } finally {
        setLoadingEnv(false);
      }
    };

    fetchServerEnv();
  }, []);

  // Auto-refresh diagnostics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/debug-env");
        const data = await response.json();
        setDiagnostics(data.diagnostics || null);
      } catch (error) {
        console.error("Auto-refresh failed:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const testUrl = `${baseUrl}/api/health-check`;
      console.log("Testing connection to:", testUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(testUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      setTestResult({
        success: true,
        status: response.status,
        data: data,
        url: testUrl,
      });
    } catch (error) {
      console.error("Connection test failed:", error);
      setTestResult({
        success: false,
        error: error.message,
        url: `${baseUrl}/api/health-check`,
      });
    } finally {
      setTesting(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "success":
        return "bg-green-900 border-green-500";
      case "warning":
        return "bg-yellow-900 border-yellow-500";
      case "error":
        return "bg-red-900 border-red-500";
      default:
        return "bg-slate-800 border-slate-600";
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case "success":
        return "bg-green-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      case "error":
        return "bg-red-600 text-white";
      default:
        return "bg-slate-600 text-white";
    }
  };

  const renderEnvSection = (title, vars, description) => (
    <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-slate-400 mb-4">{description}</p>
      )}
      <div className="space-y-3">
        {Object.entries(vars).map(([key, value]) => (
          <div
            key={key}
            className="bg-slate-900 rounded-lg p-4 border border-slate-700"
          >
            <div className="text-xs text-slate-400 mb-1 font-mono">{key}</div>
            <div
              className={`text-sm font-mono ${
                value &&
                value !== "Not set" &&
                value !== "N/A (client-side)" &&
                !value.includes("error")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {value || "Not set"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Server Diagnostics
            </h1>
            <p className="text-slate-400">
              Environment variables, backend health, and server logs
            </p>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {autoRefresh ? "⏸ Stop Auto-Refresh" : "▶ Auto-Refresh (5s)"}
          </button>
        </div>

        {/* Diagnostics Section */}
        {diagnostics && (
          <>
            {/* Auth & Database Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Auth Status */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">
                  Authentication
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Session:</span>
                    <span
                      className={`text-sm font-medium ${diagnostics.auth.sessionExists ? "text-green-400" : "text-red-400"}`}
                    >
                      {diagnostics.auth.sessionExists ? "✅ Active" : "❌ None"}
                    </span>
                  </div>
                  {diagnostics.auth.userId && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">User ID:</span>
                      <span className="text-sm font-mono text-white">
                        {diagnostics.auth.userId}
                      </span>
                    </div>
                  )}
                  {diagnostics.auth.userEmail && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Email:</span>
                      <span className="text-sm font-medium text-white">
                        {diagnostics.auth.userEmail}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Database Status */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-4">Database</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Connection:</span>
                    <span
                      className={`text-sm font-medium ${diagnostics.database.connected ? "text-green-400" : "text-red-400"}`}
                    >
                      {diagnostics.database.connected
                        ? "✅ Connected"
                        : "❌ Disconnected"}
                    </span>
                  </div>
                  {diagnostics.database.connected && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Tables:</span>
                      <span className="text-sm font-medium text-white">
                        {diagnostics.database.tableCount}
                      </span>
                    </div>
                  )}
                  {diagnostics.database.error && (
                    <div className="mt-2 p-3 bg-red-950 border border-red-700 rounded text-sm text-red-300">
                      {diagnostics.database.error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Server Logs */}
            <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  Server Logs & Diagnostics
                </h2>
                <span className="text-xs text-slate-400">
                  {new Date(diagnostics.timestamp).toLocaleString()}
                </span>
              </div>
              {diagnostics.logs.length === 0 ? (
                <p className="text-sm text-slate-400 italic">
                  No logs available
                </p>
              ) : (
                <div className="space-y-3">
                  {diagnostics.logs.map((log, index) => (
                    <div
                      key={index}
                      className={`border-l-4 p-4 rounded-r-lg ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getLevelBadge(log.level)}`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-white mb-1">{log.message}</p>
                      {log.data && (
                        <details className="mt-3">
                          <summary className="text-xs text-slate-300 cursor-pointer hover:text-white">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-slate-950 border border-slate-700 rounded text-xs overflow-x-auto text-slate-300">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Client-side Environment Variables */}
        {renderEnvSection(
          "Client-Side Environment Variables",
          clientEnvVars,
          "These are available in the browser (NEXT_PUBLIC_* only)",
        )}

        {/* Browser Info */}
        {renderEnvSection(
          "Browser Information",
          browserInfo,
          "Current browser location and URL",
        )}

        {/* Server-side Environment Variables */}
        {loadingEnv ? (
          <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Server-Side Environment Variables
            </h2>
            <div className="text-slate-400 text-center py-8">
              Loading server environment variables...
            </div>
          </div>
        ) : serverEnvVars?.error ? (
          <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Server-Side Environment Variables
            </h2>
            <div className="text-red-400 text-center py-8">
              Error: {serverEnvVars.error}
            </div>
          </div>
        ) : (
          renderEnvSection(
            "Server-Side Environment Variables",
            serverEnvVars,
            "These are available in API routes and server-side code",
          )
        )}

        {/* Base URL */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Active Base URL</h2>
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="text-sm font-mono text-blue-400">
              {baseUrl || "Not configured"}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Use this URL for EXPO_PUBLIC_PROXY_BASE_URL in your mobile app
          </p>
        </div>

        {/* Connection Test */}
        <button
          onClick={testConnection}
          disabled={testing || !baseUrl}
          className={`w-full py-4 px-6 rounded-xl font-bold text-white text-lg mb-6 transition-all ${
            testing
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } ${!baseUrl ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {testing ? "Testing Connection..." : "Test Backend Connection"}
        </button>

        {/* Test Result */}
        {testResult && (
          <div
            className={`rounded-xl p-6 border-2 ${
              testResult.success
                ? "bg-green-950 border-green-500"
                : "bg-red-950 border-red-500"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {testResult.success ? (
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <h3 className="text-xl font-bold text-white">
                {testResult.success ? "✓ Connected!" : "✗ Connection Failed"}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="bg-black bg-opacity-30 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-2">URL Tested:</div>
                <div className="text-sm text-white font-mono break-all">
                  {testResult.url}
                </div>
              </div>

              {testResult.success ? (
                <>
                  <div className="bg-black bg-opacity-30 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-2">Status:</div>
                    <div className="text-sm text-green-400 font-mono">
                      {testResult.status} OK
                    </div>
                  </div>

                  <div className="bg-black bg-opacity-30 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-2">Response:</div>
                    <pre className="text-xs text-white font-mono overflow-x-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="bg-black bg-opacity-30 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">Error:</div>
                  <div className="text-sm text-red-300 font-mono">
                    {testResult.error}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-950 border border-blue-700 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-3">
            📋 How to Use This Page:
          </h3>
          <div className="text-sm text-blue-200 space-y-2">
            <p>
              <strong>1. Check Server Logs:</strong> View recent errors, failed
              jobs, and stuck processes at the top
            </p>
            <p>
              <strong>2. Monitor Database:</strong> Verify database connection
              and table count
            </p>
            <p>
              <strong>3. Check Environment Variables:</strong> Verify all
              required variables are set (green = set, red = missing)
            </p>
            <p>
              <strong>4. Test Backend:</strong> Click "Test Backend Connection"
              to verify your API is responding
            </p>
            <p>
              <strong>5. Auto-Refresh:</strong> Enable auto-refresh to monitor
              logs in real-time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
