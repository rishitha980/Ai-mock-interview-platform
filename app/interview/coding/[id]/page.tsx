"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function CodingInterviewRoom() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState("");
  const [language] = useState("python");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [review, setReview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"tests" | "console" | "review">("tests");
  const [error, setError] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchChallenge = useCallback(async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const res = await apiFetch(`/coding-interviews/${id}`);
      if (!res.ok) throw new Error("Failed to load challenge");
      const data = await res.json();
      setChallenge(data);
      setCode(data.user_code || data.starter_code || "");
      if (data.status === "completed" && data.feedback) {
        setReview({
          score: data.score,
          feedback: data.feedback,
        });
        setActiveTab("review");
      }
      if (data.execution_results?.length > 0) {
        setTestResults(data.execution_results);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token, router]);

  useEffect(() => {
    if (id) fetchChallenge();
  }, [id, fetchChallenge]);

  const handleRun = async () => {
    if (!token || !code.trim()) return;
    setRunning(true);
    setConsoleOutput([]);
    setActiveTab("tests");
    try {
      const res = await apiFetch(`/coding-interviews/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Run failed");
      setTestResults(data.results || []);
      setConsoleOutput([
        { type: "info", text: `${data.message}` },
      ]);
    } catch (err: any) {
      setConsoleOutput([{ type: "error", text: err.message }]);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !code.trim()) return;
    setSubmitting(true);
    setActiveTab("review");
    try {
      const res = await apiFetch(`/coding-interviews/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Submission failed");
      setReview(data.review || { score: data.score, feedback: data.feedback });
      setTestResults(data.test_results || []);
      setChallenge((prev: any) => ({ ...prev, status: "completed", score: data.score }));
    } catch (err: any) {
      setConsoleOutput([{ type: "error", text: err.message }]);
      setActiveTab("console");
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [code]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-neutral-400">Loading challenge...</span>
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
        <p className="text-red-400">{error || "Challenge not found"}</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalTests = testResults.length;
  const isCompleted = challenge.status === "completed";

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-white overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <div className="h-4 w-px bg-neutral-700" />
          <h1 className="text-sm font-semibold text-white truncate max-w-[300px]">
            {challenge.title}
          </h1>
          {isCompleted && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Score: {challenge.score}/10
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400 font-mono">
            {language.toUpperCase()}
          </span>
          <button
            onClick={handleRun}
            disabled={running || !code.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500 active:scale-95 disabled:opacity-40"
          >
            {running ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {running ? "Running..." : "Run"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || isCompleted || !code.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-700 active:scale-95 disabled:opacity-40"
          >
            {submitting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {submitting ? "Evaluating..." : isCompleted ? "Submitted" : "Submit"}
          </button>
        </div>
      </div>

      {/* ── Main Split Pane ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Pane: Problem Description ──────────────────────────────── */}
        <div className="w-[40%] min-w-[300px] border-r border-neutral-800 overflow-y-auto">
          <div className="p-5">
            <h2 className="text-lg font-bold text-white mb-1">{challenge.title}</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400 font-medium">
                {challenge.language}
              </span>
              {totalTests > 0 && (
                <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  passedCount === totalTests
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {passedCount}/{totalTests} Passed
                </span>
              )}
            </div>

            {/* Problem Description */}
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed">
                {challenge.description}
              </div>
            </div>

            {/* Test Cases Preview */}
            {challenge.test_cases?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-neutral-300 mb-3">Test Cases</h3>
                <div className="space-y-2">
                  {challenge.test_cases.map((tc: any, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-neutral-400">
                          Case {i + 1}
                        </span>
                        {testResults[i] && (
                          <span className={`text-xs font-semibold ${
                            testResults[i].passed ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {testResults[i].passed ? "✓ Passed" : "✗ Failed"}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-500">Input:</span>
                          <pre className="mt-0.5 rounded bg-neutral-950 p-1.5 font-mono text-neutral-300 overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-neutral-500">Expected:</span>
                          <pre className="mt-0.5 rounded bg-neutral-950 p-1.5 font-mono text-neutral-300 overflow-x-auto">
                            {tc.expected}
                          </pre>
                        </div>
                      </div>
                      {testResults[i] && !testResults[i].passed && (
                        <div className="mt-2 text-xs">
                          <span className="text-neutral-500">Actual:</span>
                          <pre className="mt-0.5 rounded bg-red-950/30 border border-red-500/20 p-1.5 font-mono text-red-300 overflow-x-auto">
                            {testResults[i].actual || "(no output)"}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Pane: Code Editor + Console ──────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Code Editor */}
          <div className="flex-1 relative">
            <div className="absolute top-2 left-3 text-[10px] font-mono text-neutral-600 pointer-events-none z-10">
              {language}.py
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="h-full w-full resize-none bg-neutral-950 p-4 pt-7 font-mono text-sm text-emerald-300 leading-6 outline-none placeholder-neutral-700 selection:bg-blue-500/30 focus:ring-1 focus:ring-blue-500/20"
              placeholder="# Write your solution here..."
              style={{
                tabSize: 4,
                MozTabSize: 4,
              } as React.CSSProperties}
              onKeyDown={(e) => {
                // Tab key support
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const value = e.currentTarget.value;
                  setCode(value.substring(0, start) + "    " + value.substring(end));
                  setTimeout(() => {
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                  }, 0);
                }
              }}
            />
          </div>

          {/* ── Bottom Panel: Tabs ──────────────────────────────────────── */}
          <div className="border-t border-neutral-800">
            {/* Tab Headers */}
            <div className="flex items-center gap-0 border-b border-neutral-800 bg-neutral-900/50">
              {(["tests", "console", "review"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-400 bg-neutral-900/80"
                      : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab === "tests" && totalTests > 0
                    ? `Tests (${passedCount}/${totalTests})`
                    : tab}
                </button>
              ))}
              <div className="ml-auto pr-3 text-[10px] text-neutral-600 font-mono">
                Ctrl+Enter to Run
              </div>
            </div>

            {/* Tab Content */}
            <div className="h-[200px] overflow-y-auto bg-neutral-950 p-3">
              {activeTab === "tests" && (
                <div className="space-y-1.5">
                  {testResults.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">
                      Click &quot;Run&quot; to execute your code against test cases.
                    </p>
                  ) : (
                    testResults.map((r, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-mono ${
                          r.passed
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        <span>
                          Test {r.test_index}: {r.passed ? "PASSED" : "FAILED"}
                        </span>
                        <span className="text-neutral-500">{r.execution_time_ms}ms</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "console" && (
                <div className="space-y-1 font-mono text-xs">
                  {consoleOutput.length === 0 ? (
                    <p className="text-neutral-500 italic">Console output will appear here.</p>
                  ) : (
                    consoleOutput.map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.type === "error" ? "text-red-400" : "text-neutral-300"
                        }
                      >
                        {line.text}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "review" && (
                <div className="space-y-3">
                  {!review ? (
                    <p className="text-xs text-neutral-500 italic">
                      Submit your code for AI-powered evaluation.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="relative h-14 w-14">
                            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 48 48">
                              <circle
                                cx="24" cy="24" r="20"
                                fill="none"
                                stroke="#262626"
                                strokeWidth="4"
                              />
                              <circle
                                cx="24" cy="24" r="20"
                                fill="none"
                                stroke={review.score >= 7 ? "#10b981" : review.score >= 4 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="4"
                                strokeDasharray={`${(review.score / 10) * 125.6} 125.6`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                              {review.score}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-neutral-300">Score</span>
                        </div>
                      </div>

                      {review.feedback && (
                        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
                          <h4 className="text-xs font-semibold text-neutral-400 mb-1 uppercase">Feedback</h4>
                          <p className="text-xs text-neutral-300 leading-relaxed">{review.feedback}</p>
                        </div>
                      )}

                      {review.time_complexity && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-2">
                            <span className="text-[10px] text-neutral-500 uppercase">Time</span>
                            <p className="text-sm font-mono text-blue-400">{review.time_complexity}</p>
                          </div>
                          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-2">
                            <span className="text-[10px] text-neutral-500 uppercase">Space</span>
                            <p className="text-sm font-mono text-purple-400">{review.space_complexity}</p>
                          </div>
                        </div>
                      )}

                      {review.strengths?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-emerald-400 mb-1">Strengths</h4>
                          <ul className="space-y-0.5">
                            {review.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-neutral-300 flex gap-1.5">
                                <span className="text-emerald-500">•</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {review.improvements?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-amber-400 mb-1">Improvements</h4>
                          <ul className="space-y-0.5">
                            {review.improvements.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-neutral-300 flex gap-1.5">
                                <span className="text-amber-500">•</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
