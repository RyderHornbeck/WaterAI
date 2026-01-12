"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Database } from "lucide-react";

export default function JobStats() {
  const [stats, setStats] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [loadingStorage, setLoadingStorage] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/job-stats");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorage = async () => {
    setLoadingStorage(true);
    try {
      const response = await fetch("/api/admin/storage-breakdown");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStorage(data);
    } catch (err) {
      console.error("Error fetching storage:", err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const seedTestJobs = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/admin/seed-test-jobs", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      alert(
        `✅ Created ${data.summary.totalShouldCleanup} old jobs that should be cleaned up and ${data.summary.totalShouldKeep} recent jobs that should be kept.`,
      );
      // Refresh stats after seeding
      await fetchStats();
    } catch (err) {
      console.error("Error seeding jobs:", err);
      alert(`❌ Error seeding jobs: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const runCleanup = async () => {
    setCleaning(true);
    try {
      const response = await fetch("/api/worker/cleanup-jobs", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      alert(
        `✅ Cleanup completed!\n\n` +
          `- Completed jobs deleted: ${data.completedDeleted}\n` +
          `- Error jobs deleted: ${data.errorsDeleted}\n` +
          `- Processing jobs reset: ${data.processingReset}\n` +
          `- Pending jobs deleted: ${data.pendingDeleted}\n` +
          `- Total cleaned: ${data.totalCleaned}\n` +
          `- Actual rows deleted from DB: ${data.actualRowsDeleted}\n` +
          `- Storage reclaimed: YES (VACUUM ran)`,
      );
      // Refresh stats after cleanup
      await fetchStats();
    } catch (err) {
      console.error("Error running cleanup:", err);
      alert(`❌ Error running cleanup: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const runCleanupWithReindex = async () => {
    setCleaning(true);
    try {
      const response = await fetch("/api/worker/cleanup-jobs", {
        method: "POST",
        headers: { "X-Run-Reindex": "true" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      alert(
        `✅ Cleanup completed!\n\n` +
          `- Completed jobs deleted: ${data.completedDeleted}\n` +
          `- Error jobs deleted: ${data.errorsDeleted}\n` +
          `- Processing jobs reset: ${data.processingReset}\n` +
          `- Pending jobs deleted: ${data.pendingDeleted}\n` +
          `- Total cleaned: ${data.totalCleaned}\n` +
          `- Actual rows deleted from DB: ${data.actualRowsDeleted}\n` +
          `- Storage reclaimed: YES (VACUUM ran)`,
      );
      // Refresh stats after cleanup
      await fetchStats();
    } catch (err) {
      console.error("Error running cleanup with reindex:", err);
      alert(`❌ Error running cleanup with reindex: ${err.message}`);
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStorage();
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-gray-600">Loading stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Job Queue Stats
            </h1>
            <div className="flex gap-2">
              <button
                onClick={seedTestJobs}
                disabled={seeding}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Database size={16} />
                Seed Test Jobs
              </button>
              <button
                onClick={runCleanup}
                disabled={cleaning}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw
                  size={16}
                  className={cleaning ? "animate-spin" : ""}
                />
                Cleanup
              </button>
              <button
                onClick={runCleanupWithReindex}
                disabled={cleaning}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw
                  size={16}
                  className={cleaning ? "animate-spin" : ""}
                />
                Cleanup + Reindex
              </button>
              <button
                onClick={() => {
                  fetchStats();
                  fetchStorage();
                }}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          {stats && (
            <p className="text-sm text-gray-600">
              Last updated: {new Date(stats.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {/* Storage Breakdown */}
        {storage && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Storage Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Size</p>
                <p className="text-3xl font-bold text-blue-700">
                  {storage.tableSize.total_size}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Table: {storage.tableSize.table_size} | Indexes:{" "}
                  {storage.tableSize.indexes_size}
                </p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">
                  Too Recent to Delete
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {(storage.tooRecentToDelete.completed.count || 0) +
                    (storage.tooRecentToDelete.errors.count || 0) +
                    (storage.tooRecentToDelete.pending.count || 0)}{" "}
                  jobs
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Complete: {storage.tooRecentToDelete.completed.count || 0} |
                  Error: {storage.tooRecentToDelete.errors.count || 0} |
                  Pending: {storage.tooRecentToDelete.pending.count || 0}
                </p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Status Breakdown</p>
                <p className="text-2xl font-bold text-purple-700">
                  {storage.statusBreakdown.length} statuses
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  {storage.statusBreakdown.map((s) => (
                    <div key={s.status}>
                      {s.status}: {s.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2">
                💡 Why is there still data?
              </h3>
              <p className="text-sm text-gray-700">
                The remaining {storage.tableSize.total_size} is from:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                <li>
                  <strong>Recent jobs</strong> that don't meet cleanup criteria
                  yet (completed in last 5 mins, errors in last 4 hours, pending
                  in last 24 hours)
                </li>
                <li>
                  <strong>Processing/pending jobs</strong> that are still active
                </li>
                <li>
                  <strong>Database indexes and overhead</strong> (
                  {storage.tableSize.indexes_size} of indexes)
                </li>
              </ul>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Status Counts */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Current Job Counts
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Complete</p>
                  <p className="text-3xl font-bold text-green-700">
                    {stats.statusCounts.complete || 0}
                  </p>
                </div>
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Error</p>
                  <p className="text-3xl font-bold text-red-700">
                    {stats.statusCounts.error || 0}
                  </p>
                </div>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Processing</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {stats.statusCounts.processing || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-700">
                    {stats.statusCounts.pending || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Cleanup Candidates */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Cleanup Candidates (Jobs to Delete)
              </h2>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Total Ready for Cleanup
                </p>
                <p className="text-4xl font-bold text-orange-700">
                  {stats.cleanupCandidates.total}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">
                    Completed (1h+ old)
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.cleanupCandidates.completedOld}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Error (3h+ old)</p>
                  <p className="text-2xl font-bold">
                    {stats.cleanupCandidates.errorOld}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">Stuck Processing</p>
                  <p className="text-2xl font-bold">
                    {stats.cleanupCandidates.processingStuck}
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">
                    Pending (3h+ old)
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.cleanupCandidates.pendingOld}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Recent Jobs (Last 10)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentJobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-mono">#{job.id}</td>
                        <td className="p-2">{job.type}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              job.status === "complete"
                                ? "bg-green-100 text-green-800"
                                : job.status === "error"
                                  ? "bg-red-100 text-red-800"
                                  : job.status === "processing"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="p-2">{job.attempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
