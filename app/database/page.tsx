"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/app/_components/Sidebar";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  Database,
  Layers,
  FileJson,
  CheckCircle,
  AlertCircle,
  Search,
  Activity,
  HardDrive,
  RefreshCw,
  GitBranch,
} from "lucide-react";

interface CollectionData {
  name: string;
  count: number;
  sample: any;
}

export default function DatabasePage() {
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/database");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
        setDbStatus("connected");
        if (data.collections?.length > 0) {
          setSelectedCollection(data.collections[0].name);
        }
      } else {
        setDbStatus("error");
        setError("Failed to fetch database diagnostics. Admin privileges required.");
      }
    } catch (err: any) {
      setDbStatus("error");
      setError(err.message || "Failed to establish connection to backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const getSelectedSample = () => {
    const coll = collections.find((c) => c.name === selectedCollection);
    return coll ? coll.sample : null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A] text-slate-800 dark:text-slate-200 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 ml-16 md:ml-16 p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Database className="w-7 h-7 text-indigo-600" />
              Database Management (MongoDB)
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Real-time monitoring, document counts, schema maps and mock schemas for MongoDB Atlas collections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                dbStatus === "connected"
                  ? "bg-green-50 text-green-700 border-green-200/50"
                  : dbStatus === "connecting"
                  ? "bg-amber-50 text-amber-700 border-amber-200/50"
                  : "bg-red-50 text-red-700 border-red-200/50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus === "connected"
                    ? "bg-green-500 animate-pulse"
                    : dbStatus === "connecting"
                    ? "bg-amber-500 animate-bounce"
                    : "bg-red-500"
                }`}
              />
              {dbStatus === "connected" ? "CONNECTED" : dbStatus === "connecting" ? "CONNECTING..." : "DISCONNECTED"}
            </div>

            <Button
              onClick={fetchDatabaseInfo}
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 gap-1.5 h-9 font-semibold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Schemas
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Access Denied</h4>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Database grid panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: List collections (1 col) */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Active Collections
            </span>

            {loading && collections.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-white dark:bg-white/5 animate-pulse border border-slate-200/60 dark:border-white/5 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {collections.map((coll) => (
                  <div
                    key={coll.name}
                    onClick={() => setSelectedCollection(coll.name)}
                    className={`cursor-pointer border-2 rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-between ${
                      selectedCollection === coll.name
                        ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                        : "border-slate-200/70 dark:border-white/5 bg-white dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedCollection === coll.name ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <Layers className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 capitalize">{coll.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Schema Verified</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-300 block bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded border border-slate-200/30 dark:border-white/10">
                        {coll.count} doc
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Sample viewer and schemas (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sample Document Viewer */}
            <div className="bg-white dark:bg-[#141828] border border-slate-200 dark:border-white/5 shadow-sm rounded-3xl p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Collection Sample: <span className="text-indigo-600 font-bold capitalize">{selectedCollection}</span>
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">format: json</span>
              </div>

              <div className="bg-slate-950 rounded-2xl p-4 text-xs font-mono overflow-auto max-h-[350px] text-slate-300 leading-relaxed shadow-inner">
                {loading ? (
                  <p className="text-slate-500 italic">Loading documents...</p>
                ) : getSelectedSample() ? (
                  <pre 
                    className="text-emerald-400"
                    dangerouslySetInnerHTML={{
                      __html: JSON.stringify(getSelectedSample(), null, 2)
                        .replace(/(".*?"|__\w+__):/g, '<span class="text-indigo-300">$1</span>:')
                        .replace(/: (".*?")/g, ': <span class="text-amber-300">$1</span>')
                        .replace(/: (\d+)/g, ': <span class="text-cyan-400">$1</span>')
                        .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
                    }}
                  />
                ) : (
                  <p className="text-slate-500 italic">No documents found inside this collection.</p>
                )}
              </div>
            </div>

            {/* Schema Relationships Diagram */}
            <div className="bg-white dark:bg-[#141828] border border-slate-200 dark:border-white/5 shadow-sm rounded-3xl p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                <GitBranch className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Entity Schema Mapping</h3>
              </div>

              {/* Relational diagram */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-col md:flex-row items-center justify-around gap-6 relative min-h-36 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                
                {/* Users block */}
                <div className="z-10 bg-white dark:bg-[#0B0F1A] border-2 border-indigo-600 rounded-xl px-4 py-2.5 shadow-sm text-center min-w-32">
                  <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Primary</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">users</span>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">_id (email)</div>
                </div>

                <div className="text-slate-300 hidden md:block animate-pulse font-bold text-xl">➔</div>

                {/* Interviews block */}
                <div className="z-10 bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 shadow-sm text-center min-w-32">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Reference</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">interviews</span>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">user_id ➔ user</div>
                </div>

                <div className="text-slate-300 hidden md:block animate-pulse font-bold text-xl">➔</div>

                {/* Results block */}
                <div className="z-10 bg-white dark:bg-[#0B0F1A] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 shadow-sm text-center min-w-32">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Cascade</span>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">results</span>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono">interview_id ➔ int</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
