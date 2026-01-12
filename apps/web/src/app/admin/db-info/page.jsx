"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Database, HardDrive, Table } from "lucide-react";

export default function DatabaseInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/db-info");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setInfo(data);
    } catch (err) {
      console.error("Error fetching database info:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  if (loading && !info) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
          <p className="text-gray-600">Loading database info...</p>
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
            onClick={fetchInfo}
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
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Database size={32} />
              Database Information
            </h1>
            <button
              onClick={fetchInfo}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {info && (
            <p className="text-sm text-gray-600">
              Last updated: {new Date(info.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {info && (
          <>
            {/* Connection Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Database size={20} />
                Connection Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Database Name</p>
                  <p className="text-lg font-bold text-blue-900">
                    {info.connection.database_name}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Connected User</p>
                  <p className="text-lg font-bold text-blue-900">
                    {info.connection.connected_user}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Host</p>
                  <p className="text-lg font-bold text-blue-900">
                    {info.environment.databaseUrlConfigured.host}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Environment</p>
                  <p className="text-lg font-bold text-blue-900">
                    {info.environment.nodeEnv} / {info.environment.appEnv}
                  </p>
                </div>
              </div>
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">PostgreSQL Version</p>
                <p className="text-sm font-mono">
                  {info.connection.postgres_version}
                </p>
              </div>
            </div>

            {/* Storage Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <HardDrive size={20} />
                Storage Usage
              </h2>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
                <p className="text-sm text-gray-600 mb-2">
                  Total Database Size
                </p>
                <p className="text-4xl font-bold text-purple-700 mb-2">
                  {info.database.size_pretty}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {info.database.size_bytes.toLocaleString()} bytes
                </p>
              </div>
            </div>

            {/* Jobs Status Breakdown */}
            {info.jobStatusBreakdown && info.jobStatusBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Database size={20} />
                  Jobs Status Breakdown
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {info.jobStatusBreakdown.map((job) => {
                    const statusColors = {
                      complete: "bg-green-50 border-green-200 text-green-700",
                      error: "bg-red-50 border-red-200 text-red-700",
                      processing: "bg-blue-50 border-blue-200 text-blue-700",
                      pending: "bg-yellow-50 border-yellow-200 text-yellow-700",
                    };
                    const colorClass =
                      statusColors[job.status] ||
                      "bg-gray-50 border-gray-200 text-gray-700";

                    return (
                      <div
                        key={job.status}
                        className={`${colorClass} border-2 rounded-lg p-4`}
                      >
                        <p className="text-xs uppercase font-semibold mb-1 opacity-75">
                          {job.status}
                        </p>
                        <p className="text-3xl font-bold">
                          {parseInt(job.count).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Row Counts */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Table size={20} />
                Table Row Counts
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {info.rowCounts.map((row) => (
                  <div
                    key={row.table_name}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <p className="text-xs text-gray-600 mb-1 truncate">
                      {row.table_name}
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {row.row_count.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Sizes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Table Storage Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left p-3">Table Name</th>
                      <th className="text-right p-3">Total Size</th>
                      <th className="text-right p-3">Table Data</th>
                      <th className="text-right p-3">Indexes</th>
                      <th className="text-right p-3">Bytes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.tables.map((table) => (
                      <tr
                        key={table.tablename}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 font-medium">{table.tablename}</td>
                        <td className="p-3 text-right font-bold text-blue-700">
                          {table.total_size}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {table.table_size}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {table.indexes_size}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-gray-500">
                          {table.total_bytes.toLocaleString()}
                        </td>
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
