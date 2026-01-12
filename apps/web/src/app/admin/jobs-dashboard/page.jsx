"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  Image as ImageIcon,
} from "lucide-react";

export default function JobsDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState(new Set());
  const [filters, setFilters] = useState({
    jobType: "",
    status: "",
    limit: 50,
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.jobType) params.append("jobType", filters.jobType);
      if (filters.status) params.append("status", filters.status);
      params.append("limit", filters.limit.toString());

      const response = await fetch(`/api/admin/jobs-dashboard?${params}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      setJobs(data.jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const toggleJobExpanded = (jobId) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const ms = new Date(end) - new Date(start);
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderAnalysisStep = (stepName, stepData) => {
    if (!stepData) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <h4 className="font-bold text-gray-700 mb-2">{stepName}</h4>
        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(stepData, null, 2)}
        </pre>
      </div>
    );
  };

  const renderImagePreview = (base64, mimeType) => {
    if (!base64) return null;

    // Handle if base64 already includes data URI prefix
    const src = base64.startsWith("data:")
      ? base64
      : `data:${mimeType || "image/jpeg"};base64,${base64}`;

    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-3">
        <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <ImageIcon size={16} />
          Image Preview
        </h4>
        <img
          src={src}
          alt="Analyzed water container"
          className="max-w-full h-auto rounded border max-h-[400px] object-contain"
        />
      </div>
    );
  };

  const renderFinalEstimate = (result) => {
    if (!result) return null;

    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-3">
        <h4 className="font-bold text-blue-900 mb-3 text-lg">
          🎯 Final Processing Result
        </h4>

        <div className="bg-white rounded p-4 space-y-3">
          {/* Main Result */}
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800 mb-2">
              ✅ {result.ounces} oz
            </p>
            <p className="text-sm text-gray-600">
              Final Amount Added to Water Intake
            </p>
          </div>

          {/* Container Details */}
          {result.containerCapacity && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-600 mb-1">Container Capacity</p>
                <p className="text-lg font-semibold">
                  {result.containerCapacity} oz
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-600 mb-1">Classification</p>
                <p className="text-sm font-semibold">
                  {result.classification || "N/A"}
                </p>
              </div>
            </div>
          )}

          {/* Liquid Type */}
          {result.liquidType && (
            <div className="bg-purple-50 border border-purple-200 rounded p-3">
              <p className="text-xs text-purple-600 mb-1">
                Liquid Type Detected
              </p>
              <p className="text-lg font-semibold text-purple-800">
                {result.liquidType}
              </p>
            </div>
          )}

          {/* Matched Bottle */}
          {result.matchedBottleId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-xs text-yellow-600 mb-1">
                Matched Saved Bottle
              </p>
              <p className="text-sm font-semibold">
                Bottle ID: {result.matchedBottleId}
              </p>
            </div>
          )}

          {/* Barcode Info */}
          {result.barcode && (
            <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
              <p className="text-xs text-indigo-600 mb-1">Barcode Detected</p>
              <p className="text-sm font-mono font-semibold">
                {result.barcode}
              </p>
              {result.productName && (
                <p className="text-sm mt-1">Product: {result.productName}</p>
              )}
            </div>
          )}

          {/* Image URL */}
          {result.imageUrl && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-xs text-gray-600 mb-1">Uploaded Image</p>
              <a
                href={result.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline break-all"
              >
                {result.imageUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Jobs Processing Dashboard
          </h1>

          {/* Filters */}
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type
              </label>
              <select
                value={filters.jobType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, jobType: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="analyze_water">Analyze Water</option>
                <option value="analyze_text">Analyze Text</option>
                <option value="analyze_barcode">Analyze Barcode</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="complete">Complete</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit
              </label>
              <select
                value={filters.limit}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    limit: parseInt(e.target.value),
                  }))
                }
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>

            <button
              onClick={fetchJobs}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {["complete", "error", "processing", "pending"].map((status) => {
              const count = jobs.filter((j) => j.status === status).length;
              return (
                <div key={status} className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
            <p className="text-gray-600">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No jobs found with current filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const isExpanded = expandedJobs.has(job.id);
              return (
                <div
                  key={job.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  {/* Job Header */}
                  <div
                    onClick={() => toggleJobExpanded(job.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-gray-500">
                            #{job.id}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}
                          >
                            {job.status}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {job.job_type}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 flex gap-4 flex-wrap">
                          <span>
                            User: {job.user?.email || `ID ${job.user_id}`}
                          </span>
                          <span>Created: {formatDate(job.created_at)}</span>
                          {job.completed_at && (
                            <span>
                              Duration:{" "}
                              {formatDuration(
                                job.started_at || job.created_at,
                                job.completed_at,
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>
                  </div>

                  {/* Job Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Image Preview */}
                      {job.payload?.base64 &&
                        renderImagePreview(
                          job.payload.base64,
                          job.payload.mimeType,
                        )}

                      {/* Final Estimate Display */}
                      {renderFinalEstimate(job.result)}

                      {/* Payload */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <h4 className="font-bold text-gray-700 mb-2">
                          Request Payload
                        </h4>
                        <div className="bg-white p-3 rounded border text-sm space-y-1">
                          <p>
                            <strong>MIME Type:</strong>{" "}
                            {job.payload?.mimeType || "N/A"}
                          </p>
                          <p>
                            <strong>Percentage:</strong>{" "}
                            {job.payload?.percentage || "N/A"}%
                          </p>
                          <p>
                            <strong>Duration:</strong>{" "}
                            {job.payload?.duration || "N/A"}s
                          </p>
                          <p>
                            <strong>Servings:</strong>{" "}
                            {job.payload?.servings || "N/A"}
                          </p>
                          <p>
                            <strong>Liquid Type:</strong>{" "}
                            {job.payload?.liquidType || "N/A"}
                          </p>
                          <p>
                            <strong>Base64 Length:</strong>{" "}
                            {job.payload?.base64?.length || 0} chars
                          </p>
                        </div>
                      </div>

                      {/* Error Message */}
                      {job.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                          <h4 className="font-bold text-red-800 mb-2">
                            Error Message
                          </h4>
                          <pre className="text-xs text-red-700 whitespace-pre-wrap">
                            {job.error_message}
                          </pre>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-600">Created</p>
                          <p className="font-mono">
                            {formatDate(job.created_at)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-600">Started</p>
                          <p className="font-mono">
                            {formatDate(job.started_at)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-gray-600">Completed</p>
                          <p className="font-mono">
                            {formatDate(job.completed_at)}
                          </p>
                        </div>
                      </div>

                      {/* Attempts */}
                      <div className="mt-3 text-sm text-gray-600">
                        <p>
                          Attempts: {job.attempts} / {job.max_attempts}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
