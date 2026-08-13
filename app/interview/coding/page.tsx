"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  Code2,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Loader2,
  Sparkles
} from "lucide-react";

export default function CodingPracticeDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [topic, setTopic] = useState("Data Structures & Algorithms");
  const [difficulty, setDifficulty] = useState("Medium");
  const [language, setLanguage] = useState("python");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchCodingSessions();
  }, []);

  const fetchCodingSessions = async () => {
    try {
      const res = await apiFetch("/coding-interviews");
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setSessions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load coding history");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await apiFetch("/coding-interviews", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create coding session");
      
      const newId = data.challenge.id;
      router.push(`/interview/coding/${newId}`);
    } catch (err: any) {
      setError(err.message || "Failed to start coding session");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this coding session?")) return;
    try {
      const res = await apiFetch(`/coding-interviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Deletion failed");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete coding session");
    }
  };

  const completedCount = sessions.filter(s => s.status === "completed").length;
  const avgScore = sessions.filter(s => s.status === "completed" && s.score).length > 0
    ? (sessions.filter(s => s.status === "completed" && s.score).reduce((sum, s) => sum + s.score, 0) / sessions.filter(s => s.status === "completed" && s.score).length).toFixed(1)
    : "—";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Coding Module</p>
            <h1 className="text-2xl font-bold text-slate-900">AI Coding Practice Room</h1>
            <p className="text-sm text-slate-500 mt-0.5">Challenge yourself with personalized algorithmic problems powered by Gemini AI.</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sessions</span>
              <div className="p-2 rounded-lg bg-indigo-50"><Code2 className="h-4 w-4 text-indigo-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              <div className="p-2 rounded-lg bg-green-50"><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Score</span>
              <div className="p-2 rounded-lg bg-amber-50"><Award className="h-4 w-4 text-amber-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{avgScore}<span className="text-xs text-slate-400 font-normal">/10</span></p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Setup / Create Session Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                </div>
                <h2 className="text-base font-bold text-slate-800">Generate Challenge</h2>
              </div>

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Topic / Concept
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <optgroup label="Data Structures & Algorithms">
                      <option value="Data Structures & Algorithms">DSA (General)</option>
                      <option value="Arrays & Hashing">Arrays & Hashing</option>
                      <option value="Two Pointers & Sliding Window">Two Pointers & Sliding Window</option>
                      <option value="Recursion & Backtracking">Recursion & Backtracking</option>
                      <option value="Trees & Graphs">Trees & Graphs</option>
                      <option value="Dynamic Programming">Dynamic Programming</option>
                      <option value="Bit Manipulation">Bit Manipulation</option>
                    </optgroup>
                    <optgroup label="Programming Language Concepts">
                      <option value="Python Core & Syntax">Python Core & Syntax</option>
                      <option value="JavaScript / TypeScript Concepts">JavaScript & TypeScript Concepts</option>
                      <option value="Java Core & Object-Oriented Programming">Java Core & OOP</option>
                      <option value="C++ Memory Management & STL">C++ Memory Management & STL</option>
                      <option value="Go Channels & Concurrency">Go Channels & Concurrency</option>
                      <option value="SQL Queries & Database Management">SQL & Database Queries</option>
                    </optgroup>
                    <optgroup label="Software Engineering">
                      <option value="System Design Coding">System Design Coding</option>
                      <option value="Object-Oriented Design (OOD)">Object-Oriented Design (OOD)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Easy", "Medium", "Hard"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          difficulty === lvl
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Language Sandbox
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="python">Python 3 (Sandbox Execution)</option>
                    <option value="javascript" disabled>JavaScript (Coming Soon)</option>
                  </select>
                  <span className="block text-[10px] text-slate-400 mt-1.5">
                    Python code executes dynamically against live test cases.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Start Challenge
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* History / Previous Sessions Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Your Coding Challenges
              </h2>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <Code2 className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No coding sessions yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select your topic and difficulty on the left to generate your first challenge!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => router.push(`/interview/coding/${session.id}`)}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl p-4 transition-all cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            session.difficulty === "Easy"
                              ? "bg-green-50 text-green-600 border border-green-100"
                              : session.difficulty === "Hard"
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          }`}>
                            {session.difficulty}
                          </span>
                          <span className="text-[10px] font-semibold font-mono bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            {session.language.toUpperCase()}
                          </span>
                          {session.status === "completed" ? (
                            <span className="text-[10px] bg-green-50 text-green-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 border border-green-100">
                              <CheckCircle2 className="h-3 w-3" /> Graded
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-50 text-amber-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 border border-amber-100 animate-pulse">
                              <Play className="h-3 w-3" /> In Progress
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm truncate pr-4 mt-1">
                          {session.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Started on {new Date(session.created_at * 1000).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                        {session.status === "completed" ? (
                          <div className="text-sm font-extrabold text-indigo-600 flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            Score: {session.score} <span className="text-[10px] font-normal text-slate-400">/10</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic flex items-center gap-1">
                            <Play className="h-3 w-3 text-amber-500" /> Resume practice
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDelete(session.id, e)}
                            className="text-slate-300 hover:text-red-400 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete practice session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
