"use client";

import { useState, useEffect, useRef } from "react";
import useUser from "@/utils/useUser";

export default function LoadTestPage() {
  const { data: user, loading } = useUser();
  const [imageUrl, setImageUrl] = useState("");
  const [count, setCount] = useState(500);
  const [isRunning, setIsRunning] = useState(false);
  const [jobIds, setJobIds] = useState([]);
  const [status, setStatus] = useState(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/account/signin";
    }
  }, [user, loading]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startLoadTest = async () => {
    if (!imageUrl.trim()) {
      alert("Please enter an image URL");
      return;
    }

    setIsRunning(true);
    setJobIds([]);
    setStatus(null);

    try {
      console.log(
        `Starting load test with ${count} jobs using the same image...`,
      );
      const response = await fetch("/api/load-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, count }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to create jobs";
        const details = data.details ? `\n\n${data.details}` : "";
        const jobsCreated = data.jobsCreated
          ? `\n\nJobs created before error: ${data.jobsCreated}`
          : "";
        throw new Error(`${errorMsg}${details}${jobsCreated}`);
      }

      console.log(`Created ${data.count} jobs`);
      setJobIds(data.jobIds);

      // Trigger the worker to process the jobs
      console.log("Triggering worker to process jobs...");
      fetch("/api/worker/process-jobs", { method: "POST" })
        .then((res) => res.json())
        .then((result) => {
          console.log("Worker processing complete:", result);
        })
        .catch((err) => {
          console.error("Worker trigger error:", err);
        });

      // Start polling for status
      pollIntervalRef.current = setInterval(() => {
        checkStatus(data.jobIds);
      }, 2000);
    } catch (error) {
      console.error("Load test error:", error);
      alert(`Error: ${error.message}`);
      setIsRunning(false);
    }
  };

  const checkStatus = async (ids) => {
    try {
      const response = await fetch(`/api/load-test?jobIds=${ids.join(",")}`);
      const data = await response.json();

      setStatus(data);

      // Stop polling if all jobs are done
      const stillProcessing =
        data.statusCounts.pending + data.statusCounts.processing;
      if (stillProcessing === 0) {
        console.log("All jobs completed!");
        setIsRunning(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  const resetTest = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsRunning(false);
    setJobIds([]);
    setStatus(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Worker Load Test</h1>
          <p className="text-gray-600 mb-8">
            Test your worker system by simulating hundreds of concurrent photo
            submissions with the same test image
          </p>

          {/* Configuration */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/water-bottle.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isRunning}
              />
              <p className="text-xs text-gray-500 mt-2">
                Upload a photo in your app, then paste the image URL here. All
                jobs will process this same image.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Jobs
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCount(isNaN(val) ? 1 : val);
                }}
                min="1"
                max="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isRunning}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={startLoadTest}
                disabled={isRunning || !imageUrl.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? "Running..." : "Start Load Test"}
              </button>

              {isRunning && (
                <button
                  onClick={resetTest}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Cancel
                </button>
              )}

              {jobIds.length > 0 && !isRunning && (
                <button
                  onClick={resetTest}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Status Display */}
          {status && (
            <div className="space-y-6">
              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4">📊 Results</h2>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>
                      {status.statusCounts.complete + status.statusCounts.error}{" "}
                      / {status.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${((status.statusCounts.complete + status.statusCounts.error) / status.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Status Counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-700">
                      {status.statusCounts.pending}
                    </div>
                    <div className="text-sm text-yellow-600">Pending</div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-700">
                      {status.statusCounts.processing}
                    </div>
                    <div className="text-sm text-blue-600">Processing</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700">
                      {status.statusCounts.complete}
                    </div>
                    <div className="text-sm text-green-600">Complete</div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-700">
                      {status.statusCounts.error}
                    </div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold mb-4">⚡ Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Success Rate</div>
                      <div className="text-xl font-bold text-green-600">
                        {status.successRate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Avg Time</div>
                      <div className="text-xl font-bold">
                        {status.timing.avgSeconds}s
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Min Time</div>
                      <div className="text-xl font-bold text-green-600">
                        {status.timing.minSeconds}s
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Max Time</div>
                      <div className="text-xl font-bold text-orange-600">
                        {status.timing.maxSeconds}s
                      </div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {status.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">
                      ⚠️ Errors (showing first 10)
                    </h3>
                    <div className="space-y-2">
                      {status.errors.map((err) => (
                        <div key={err.id} className="text-sm">
                          <span className="font-mono text-red-700">
                            Job {err.id}:
                          </span>{" "}
                          <span className="text-red-600">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Message */}
                {!isRunning &&
                  status.statusCounts.pending === 0 &&
                  status.statusCounts.processing === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <div className="text-lg font-semibold text-green-800">
                        Load test complete!
                      </div>
                      <div className="text-green-700 mt-2">
                        {status.statusCounts.complete} jobs succeeded,{" "}
                        {status.statusCounts.error} failed
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!jobIds.length && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
              <h3 className="font-semibold text-blue-800 mb-2">
                📝 How to use:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                <li>
                  Open your mobile app and take/upload a water bottle photo
                </li>
                <li>Copy the image URL from the network tab or database</li>
                <li>
                  Paste it above and set how many concurrent jobs to create
                </li>
                <li>
                  Click "Start Load Test" and watch your workers handle the
                  load!
                </li>
                <li>
                  All jobs will process the same image to simulate real
                  concurrent usage
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
