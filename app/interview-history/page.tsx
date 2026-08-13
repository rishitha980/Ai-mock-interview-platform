"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import { apiFetch } from "@/lib/api";
import {
  Search,
  ChevronDown,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Award,
  BarChart2,
  TrendingUp,
  Timer,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
interface InterviewItem {
  id: string;
  role: string;
  company_name: string;
  interview_type: string;
  difficulty: string;
  score: number;
  duration_minutes: number;
  status: string;
  date: string;
  created_at: number;
}

interface Stats {
  total_interviews: number;
  average_score: number;
  best_score: number;
  total_minutes: number;
}

interface FilterOptions {
  roles: string[];
  difficulties: string[];
  statuses: string[];
}

interface ResultData {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  overall_feedback: string;
  strengths: string[];
  weaknesses: string[];
  evaluations: Array<{
    question: string;
    user_answer: string;
    score: number;
    feedback: string;
    improvement_tip: string;
    correct_answer: string;
  }>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTotalTime(minutes: number): string {
  if (!minutes) return "0 mins";
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getStatusConfig(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "completed")
    return { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle };
  if (s === "scheduled" || s === "ready")
    return { label: "Scheduled", color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: Clock };
  if (s === "cancelled")
    return { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: XCircle };
  return { label: status, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: AlertCircle };
}

function getDifficultyConfig(difficulty: string) {
  const d = (difficulty || "").toLowerCase();
  if (d === "easy") return { color: "#22c55e", bg: "rgba(34,197,94,0.15)" };
  if (d === "hard") return { color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Skeleton loader                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-4 py-4">
          <div
            className="h-4 rounded"
            style={{ background: "rgba(255,255,255,0.06)", width: i === 1 ? "80%" : "60%" }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Report Modal                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function ReportModal({
  interviewId,
  role,
  onClose,
}: {
  interviewId: string;
  role: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    apiFetch(`/interviews/${interviewId}/result`)
      .then((res) => res.json())
      .then((data) => {
        if (data.detail) setError(data.detail);
        else setResult(data);
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [interviewId]);

  const pct = (v: number) => Math.round(((v || 0) / 10) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: "#0f1629",
          border: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-5"
          style={{ background: "#0f1629", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6366f1" }}>
              Interview Report
            </p>
            <h2 className="text-lg font-bold text-white mt-0.5">{role}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "#94a3b8" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#fff")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#94a3b8")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#6366f1" }} />
              <p className="text-sm" style={{ color: "#64748b" }}>Loading report…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle className="h-10 w-10" style={{ color: "#ef4444" }} />
              <p className="text-sm" style={{ color: "#94a3b8" }}>{error}</p>
              <p className="text-xs" style={{ color: "#475569" }}>
                This interview may not have been completed yet.
              </p>
            </div>
          )}

          {!loading && !error && result && (
            <>
              {/* Score Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Overall Score", value: pct(result.overall_score), color: "#6366f1" },
                  { label: "Technical", value: pct(result.technical_score || result.overall_score), color: "#22c55e" },
                  { label: "Communication", value: pct(result.communication_score || result.overall_score), color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-4 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-3xl font-black" style={{ color }}>{value}%</div>
                    <div className="text-xs mt-1 font-semibold" style={{ color: "#64748b" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {result.overall_feedback && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>AI Summary</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>{result.overall_feedback}</p>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#22c55e" }}>
                    ✓ Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {(result.strengths || []).length === 0 ? (
                      <li className="text-xs italic" style={{ color: "#475569" }}>None listed</li>
                    ) : (
                      result.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#94a3b8" }}>
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#22c55e" }} />
                          {s}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#f59e0b" }}>
                    ⚠ Areas to Improve
                  </p>
                  <ul className="space-y-1.5">
                    {(result.weaknesses || []).length === 0 ? (
                      <li className="text-xs italic" style={{ color: "#475569" }}>None listed</li>
                    ) : (
                      result.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#94a3b8" }}>
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
                          {w}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {/* Q&A Evaluations */}
              {(result.evaluations || []).length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-3" style={{ color: "#e2e8f0" }}>Question-wise Feedback</p>
                  <div className="space-y-2">
                    {result.evaluations.map((ev, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden"
                        style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                      >
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                          style={{ background: expanded === idx ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)" }}
                          onClick={() => setExpanded(expanded === idx ? null : idx)}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#475569" }}>
                              Q{idx + 1}
                            </span>
                            <p className="text-xs font-medium truncate mt-0.5" style={{ color: "#cbd5e1" }}>
                              {ev.question}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <span
                              className="text-sm font-black"
                              style={{ color: getScoreColor(pct(ev.score)) }}
                            >
                              {pct(ev.score)}%
                            </span>
                            <ChevronDown
                              className="h-4 w-4 transition-transform"
                              style={{
                                color: "#475569",
                                transform: expanded === idx ? "rotate(180deg)" : "none",
                              }}
                            />
                          </div>
                        </button>

                        {expanded === idx && (
                          <div
                            className="px-4 pb-4 pt-2 space-y-3"
                            style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            {ev.user_answer && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#475569" }}>Your Answer</p>
                                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{ev.user_answer}</p>
                              </div>
                            )}
                            {ev.feedback && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#22c55e" }}>Feedback</p>
                                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{ev.feedback}</p>
                              </div>
                            )}
                            {ev.improvement_tip && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#f59e0b" }}>Tip</p>
                                <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{ev.improvement_tip}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action: Full Report */}
              <div className="flex justify-center pt-2">
                <Link
                  href={`/interview/${interviewId}/result`}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "#6366f1", color: "#fff" }}
                  onClick={onClose}
                >
                  View Full Report
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Delete Confirm Modal                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({
  role,
  onConfirm,
  onCancel,
  deleting,
}: {
  role: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "#0f1629",
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(239,68,68,0.15)" }}
        >
          <Trash2 className="h-6 w-6" style={{ color: "#ef4444" }} />
        </div>
        <h3 className="text-center text-lg font-bold text-white mb-2">Delete Interview</h3>
        <p className="text-center text-sm mb-6" style={{ color: "#94a3b8" }}>
          Are you sure you want to delete the <span className="font-semibold text-white">{role}</span> interview?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Stat Card                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex-1 min-w-0 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f1629 0%, #131a2e 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background: accent }}
      />
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>{label}</p>
      {loading ? (
        <div className="h-9 w-24 rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }} />
      ) : (
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      )}
      <div
        className="absolute bottom-3 right-4 p-2 rounded-lg"
        style={{ background: `${accent}22` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Page                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function InterviewHistoryPage() {
  const router = useRouter();

  // Data state
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total_interviews: 0, average_score: 0, best_score: 0, total_minutes: 0 });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ roles: [], difficulties: [], statuses: [] });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI state
  const [tableLoading, setTableLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [reportModal, setReportModal] = useState<{ id: string; role: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; role: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  // ── Fetch stats + filter options (once) ────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, []);

  // ── Fetch table data whenever filters change ────────────────────────────────
  useEffect(() => {
    fetchHistory();
  }, [debouncedSearch, roleFilter, difficultyFilter, statusFilter, dateFrom, dateTo, page]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/history/stats");
      if (res.ok) setStats(await res.json());
    } catch { }
    setStatsLoading(false);
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await apiFetch("/history/filter-options");
      if (res.ok) setFilterOptions(await res.json());
    } catch { }
  };

  const fetchHistory = async () => {
    setTableLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await apiFetch(`/history/?${params.toString()}`);
      if (!res.ok) {
        setError("Failed to load interview history.");
        setTableLoading(false);
        return;
      }
      const data = await res.json();
      setInterviews(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch {
      setError("Network error. Please try again.");
    }
    setTableLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/interviews/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteModal(null);
        // Refresh data
        fetchHistory();
        fetchStats();
      }
    } catch { }
    setDeleting(false);
  };

  const handleDownload = async (interviewId: string, role: string) => {
    try {
      const res = await apiFetch(`/interviews/${interviewId}/result`);
      if (!res.ok) { alert("Report not available for this interview."); return; }
      const data = await res.json();

      const pct = (v: number) => Math.round(((v || 0) / 10) * 100);
      const lines: string[] = [
        `INTERVIEW REPORT`,
        `================`,
        `Role: ${role}`,
        ``,
        `SCORES`,
        `------`,
        `Overall Score:       ${pct(data.overall_score)}%`,
        `Technical Score:     ${pct(data.technical_score || data.overall_score)}%`,
        `Communication Score: ${pct(data.communication_score || data.overall_score)}%`,
        ``,
        `SUMMARY`,
        `-------`,
        data.overall_feedback || "N/A",
        ``,
        `STRENGTHS`,
        `---------`,
        ...(data.strengths || []).map((s: string) => `• ${s}`),
        ``,
        `AREAS FOR IMPROVEMENT`,
        `---------------------`,
        ...(data.weaknesses || []).map((w: string) => `• ${w}`),
        ``,
        `QUESTION-WISE FEEDBACK`,
        `----------------------`,
        ...(data.evaluations || []).flatMap((ev: any, i: number) => [
          `Q${i + 1}: ${ev.question}`,
          `Score: ${pct(ev.score)}%`,
          `Feedback: ${ev.feedback || "N/A"}`,
          `Tip: ${ev.improvement_tip || "N/A"}`,
          ``,
        ]),
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Interview_Report_${role.replace(/\s+/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download report.");
    }
  };

  // ── Pagination helpers ──────────────────────────────────────────────────────
  const getPaginationPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  /* ── Render ────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen" style={{ background: "#080c1a" }}>
      <Sidebar />

      {/* Modals */}
      {reportModal && (
        <ReportModal
          interviewId={reportModal.id}
          role={reportModal.role}
          onClose={() => setReportModal(null)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          role={deleteModal.role}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
          deleting={deleting}
        />
      )}

      <main className="flex-1 ml-16 p-6 pb-12 overflow-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Interview History</h1>
          </div>
          <Link
            href="/interview/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
            }}
          >
            <Plus className="h-4 w-4" />
            New Interview
          </Link>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <StatCard
            icon={BarChart2}
            label="Total Interviews"
            value={`${stats.total_interviews}`}
            accent="#6366f1"
            loading={statsLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Average Score"
            value={stats.average_score > 0 ? `${stats.average_score}%` : "0%"}
            accent="#22c55e"
            loading={statsLoading}
          />
          <StatCard
            icon={Award}
            label="Best Score"
            value={stats.best_score > 0 ? `${stats.best_score}%` : "0%"}
            accent="#f59e0b"
            loading={statsLoading}
          />
          <StatCard
            icon={Timer}
            label="Total Interview Time"
            value={formatTotalTime(stats.total_minutes)}
            accent="#a78bfa"
            loading={statsLoading}
          />
        </div>

        {/* ── Search & Filters ─────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center"
          style={{
            background: "linear-gradient(135deg, #0f1629 0%, #131a2e 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "#64748b" }} />
            <input
              type="text"
              placeholder="Search interviews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: "#e2e8f0" }}
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              }}
            >
              <option value="all">All Roles</option>
              {filterOptions.roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none" style={{ color: "#64748b" }} />
          </div>

          {/* Difficulty Filter */}
          <div className="relative">
            <select
              value={difficultyFilter}
              onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              }}
            >
              <option value="all">All Difficulty</option>
              {filterOptions.difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none" style={{ color: "#64748b" }} />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0",
              }}
            >
              <option value="all">All Status</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 pointer-events-none" style={{ color: "#64748b" }} />
          </div>

          {/* Date Range */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#64748b",
            }}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-sm"
              style={{ color: dateFrom ? "#e2e8f0" : "#64748b", width: "120px" }}
            />
            <span className="text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-sm"
              style={{ color: dateTo ? "#e2e8f0" : "#64748b", width: "120px" }}
            />
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f1629 0%, #131a2e 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Role", "Date", "Difficulty", "Score", "Duration", "Status", "Action"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#475569" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Loading skeletons */}
                {tableLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-4 rounded-lg animate-pulse"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            width: j === 1 ? "75%" : j === 7 ? "90px" : "55%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Error */}
                {!tableLoading && error && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "#ef4444" }} />
                      <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{error}</p>
                    </td>
                  </tr>
                )}

                {/* Empty state */}
                {!tableLoading && !error && interviews.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(99,102,241,0.12)" }}
                        >
                          <FileText className="h-7 w-7" style={{ color: "#6366f1" }} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white mb-1">No interview history available</p>
                          <p className="text-sm mb-4" style={{ color: "#475569" }}>
                            {debouncedSearch || roleFilter !== "all" || difficultyFilter !== "all" || statusFilter !== "all"
                              ? "No interviews match your current filters."
                              : "Complete your first interview to see your history here."}
                          </p>
                        </div>
                        <Link
                          href="/interview/create"
                          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          style={{
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            color: "#fff",
                            boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
                          }}
                        >
                          Create Your First Interview
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Interview rows */}
                {!tableLoading && !error && interviews.map((interview, idx) => {
                  const statusCfg = getStatusConfig(interview.status);
                  const diffCfg = getDifficultyConfig(interview.difficulty);
                  const StatusIcon = statusCfg.icon;
                  const isCompleted = interview.status.toLowerCase() === "completed";

                  return (
                    <tr
                      key={interview.id}
                      className="transition-colors"
                      style={{
                        borderBottom: idx < interviews.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Role + Company */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{interview.role}</p>
                          {interview.company_name && (
                            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{interview.company_name}</p>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4">
                        <span className="text-sm" style={{ color: "#94a3b8" }}>
                          {interview.date || "—"}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="px-4 py-4">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold"
                          style={{ color: diffCfg.color, background: diffCfg.bg }}
                        >
                          {interview.difficulty}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-4">
                        <span
                          className="text-sm font-bold"
                          style={{ color: isCompleted ? getScoreColor(interview.score) : "#475569" }}
                        >
                          {isCompleted ? `${interview.score}%` : "—"}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-4">
                        <span className="text-sm" style={{ color: "#94a3b8" }}>
                          {formatDuration(interview.duration_minutes)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{ color: statusCfg.color, background: statusCfg.bg }}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          {/* View Report */}
                          <button
                            onClick={() => setReportModal({ id: interview.id, role: interview.role })}
                            title="View Report"
                            className="p-2 rounded-lg transition-all"
                            style={{ color: "#6366f1", background: "rgba(99,102,241,0.08)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.2)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,0.08)"; }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => handleDownload(interview.id, interview.role)}
                            title="Download Report"
                            className="p-2 rounded-lg transition-all"
                            style={{ color: "#22c55e", background: "rgba(34,197,94,0.08)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,197,94,0.2)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,197,94,0.08)"; }}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModal({ id: interview.id, role: interview.role })}
                            title="Delete Interview"
                            className="p-2 rounded-lg transition-all"
                            style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────────────── */}
          {!tableLoading && !error && totalPages > 1 && (
            <div
              className="flex items-center justify-center gap-2 px-4 py-5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Prev */}
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg transition-all"
                style={{
                  color: page === 1 ? "#1e293b" : "#94a3b8",
                  background: "rgba(255,255,255,0.05)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPaginationPages().map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-sm" style={{ color: "#475569" }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className="h-9 w-9 rounded-lg text-sm font-bold transition-all"
                    style={
                      page === p
                        ? { background: "#6366f1", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }
                        : { background: "rgba(255,255,255,0.05)", color: "#94a3b8" }
                    }
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg transition-all"
                style={{
                  color: page === totalPages ? "#1e293b" : "#94a3b8",
                  background: "rgba(255,255,255,0.05)",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Record count */}
        {!tableLoading && !error && totalCount > 0 && (
          <p className="text-xs mt-3 text-center" style={{ color: "#334155" }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} interviews
          </p>
        )}
      </main>
    </div>
  );
}
