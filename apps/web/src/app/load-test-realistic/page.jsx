"use client";

import { useState } from "react";

export default function RealisticLoadTestPage() {
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800",
  );
  const [concurrency, setConcurrency] = useState(10);
  const [totalRequests, setTotalRequests] = useState(50);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/load-test-realistic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          concurrency: parseInt(concurrency, 10),
          totalRequests: parseInt(totalRequests, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Test failed");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🚀 Realistic Load Test
          </h1>
          <p className="text-slate-600 text-lg">
            Tests the full stack: HTTP endpoints, auth, JSON parsing, polling,
            and workers
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Configuration
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="https://example.com/water-bottle.jpg"
              />
              <p className="mt-2 text-sm text-slate-500">
                Public image URL (will be fetched once and reused)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Concurrency (1-50)
                </label>
                <input
                  type="number"
                  value={concurrency}
                  onChange={(e) => setConcurrency(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Simultaneous requests
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Total Requests (1-500)
                </label>
                <input
                  type="number"
                  value={totalRequests}
                  onChange={(e) => setTotalRequests(e.target.value)}
                  min="1"
                  max="500"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Total user requests
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={runTest}
            disabled={isRunning}
            className={`mt-6 w-full py-4 rounded-xl font-bold text-lg transition-all ${
              isRunning
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {isRunning ? "Running Test..." : "Run Load Test"}
          </button>
        </div>

        {/* What This Tests */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            ✅ What This Tests
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    HTTP Request Layer
                  </p>
                  <p className="text-sm text-slate-600">
                    TCP connections, TLS handshakes, HTTP parsing
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Authentication Overhead
                  </p>
                  <p className="text-sm text-slate-600">
                    Token validation, session queries
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    JSON Parsing (Large Payloads)
                  </p>
                  <p className="text-sm text-slate-600">
                    2-5MB base64 images per request
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Polling Behavior
                  </p>
                  <p className="text-sm text-slate-600">
                    Every 2 seconds like real mobile app
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    Concurrent Request Limits
                  </p>
                  <p className="text-sm text-slate-600">
                    Next.js connection pooling, queuing
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-semibold text-slate-900">
                    End-to-End Timing
                  </p>
                  <p className="text-sm text-slate-600">
                    From request to final water entry
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-bold text-red-900 mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                📊 Summary
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    {results.summary.successRate}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    Success Rate
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {results.summary.successful} /{" "}
                    {results.summary.totalRequests} succeeded
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-6">
                  <div className="text-3xl font-bold text-blue-700 mb-1">
                    {results.summary.requestsPerSecond}
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    Requests/Second
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Total time: {results.summary.totalTimeSeconds}s
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6">
                  <div className="text-3xl font-bold text-purple-700 mb-1">
                    {results.summary.concurrency}
                  </div>
                  <div className="text-sm font-semibold text-purple-600">
                    Concurrency
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    Simultaneous users
                  </div>
                </div>
              </div>
            </div>

            {/* Timings */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                ⏱️ Performance Timings
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <span className="font-semibold text-slate-700">
                    Create Job Request (HTTP + Auth + Parse)
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    {results.timings.avgCreateRequestMs}ms
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                  <span className="font-semibold text-slate-700">
                    Average Poll Attempts
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    {results.timings.avgPollAttempts}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <span className="font-bold text-slate-800">
                    Total Time (Submit → Complete)
                  </span>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-700">
                      {results.timings.avgCompleteSeconds}s
                    </div>
                    <div className="text-sm text-slate-500">
                      Min: {results.timings.minCompleteSeconds}s | Max:{" "}
                      {results.timings.maxCompleteSeconds}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors */}
            {Object.keys(results.errors).length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-orange-900 mb-4">
                  ⚠️ Errors Encountered
                </h2>
                <div className="space-y-2">
                  {Object.entries(results.errors).map(([error, count]) => (
                    <div
                      key={error}
                      className="flex justify-between items-center p-3 bg-white rounded-lg"
                    >
                      <span className="text-slate-700 font-mono text-sm">
                        {error}
                      </span>
                      <span className="font-bold text-orange-600">
                        {count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Results */}
            {results.sampleSuccessful.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                  🔍 Sample Successful Requests
                </h2>
                <div className="space-y-3">
                  {results.sampleSuccessful.map((sample, idx) => (
                    <div
                      key={sample.jobId}
                      className="p-4 bg-green-50 rounded-xl border border-green-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-slate-700">
                          Job #{sample.jobId}
                        </span>
                        <span className="text-sm text-green-600 font-semibold">
                          {sample.timings.complete}ms
                        </span>
                      </div>
                      {sample.result && (
                        <div className="text-sm text-slate-600 font-mono">
                          {sample.result.ounces}oz -{" "}
                          {sample.result.classification}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
