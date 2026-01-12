"use client";

import { useState, useEffect } from "react";

export default function WorkerMonitor() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [createCount, setCreateCount] = useState(100);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/monitor-workers");
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  const createTestJobs = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/test-workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: createCount }),
      });
      const data = await response.json();
      alert(data.message);
      fetchStats();
    } catch (error) {
      console.error("Error creating test jobs:", error);
      alert("Failed to create test jobs");
    } finally {
      setCreating(false);
    }
  };

  const triggerWorkers = async () => {
    setProcessing(true);
    try {
      const response = await fetch("/api/worker/process-jobs", {
        method: "POST",
      });
      const data = await response.json();
      alert(
        `Workers processed ${data.processed} jobs in ${data.batches} batches (${data.duration}ms total)`,
      );
      fetchStats();
    } catch (error) {
      console.error("Error triggering workers:", error);
      alert("Failed to trigger workers");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchStats, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Worker Monitor
          </h1>
          <p className="text-gray-600">
            Real-time job queue status and performance metrics
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {stats?.timestamp}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-refresh
              </label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  autoRefresh
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {autoRefresh ? "ON" : "OFF"}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create test jobs
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={createCount}
                  onChange={(e) => setCreateCount(parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="1000"
                />
                <button
                  onClick={createTestJobs}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Run workers
              </label>
              <button
                onClick={triggerWorkers}
                disabled={processing}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300"
              >
                {processing ? "Processing..." : "🚀 Process Jobs"}
              </button>
            </div>
            <div>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>

        {/* Queue Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Pending"
            value={stats?.queue?.pending}
            color="yellow"
          />
          <StatCard
            title="Processing"
            value={stats?.queue?.processing}
            color="blue"
          />
          <StatCard
            title="Complete"
            value={stats?.queue?.complete}
            color="green"
          />
          <StatCard title="Error" value={stats?.queue?.error} color="red" />
          <StatCard
            title="Total (1h)"
            value={stats?.queue?.total}
            color="gray"
          />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Jobs/Minute
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.performance?.jobs_per_minute || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Avg Duration
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.performance?.avg_duration_ms
                ? `${stats.performance.avg_duration_ms}ms`
                : "N/A"}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Oldest Pending
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats?.oldest_pending
                ? `${stats.oldest_pending.age_seconds}s`
                : "None"}
            </p>
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Jobs (Last 20)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.recent_jobs?.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {job.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.type}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.attempts}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.duration_ms ? `${job.duration_ms}ms` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value || 0}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    complete: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
