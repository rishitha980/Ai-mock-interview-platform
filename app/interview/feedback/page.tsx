"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  Brain,
  TrendingUp,
  Award,
  Download,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Bell,
  Search,
} from "lucide-react";

interface StatsData {
  total_interviews: number;
  completed_interviews: number;
  upcoming_interviews: number;
  average_score: number;
  current_streak: number;
  avg_technical: number;
  avg_communication: number;
}

// ─── Radial Progress Ring Component ─────────────────────────────────────────

function RadialGauge({
  score,
  label,
  max = 100,
  color = "stroke-indigo-500",
  shadowColor = "rgba(99, 102, 241, 0.25)",
}: {
  score: number;
  label: string;
  max?: number;
  color?: string;
  shadowColor?: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / max) * circumference;

  return (
    <div className="flex flex-col items-center justify-between bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg h-full">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{label}</span>
      
      <div className="relative h-24 w-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-[#1F223D]"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: "stroke-dashoffset 1s ease-out",
              filter: `drop-shadow(0 0 6px ${shadowColor})`,
            }}
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-2xl font-black text-white">{Math.round(score)}</span>
          <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">/ {max}</span>
        </div>
      </div>

      <div className="h-4" /> {/* Spacer */}
    </div>
  );
}

// ─── AI Feedback Page ────────────────────────────────────────────────────────

export default function AIFeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInitial, setUserInitial] = useState("U");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [stats, setStats] = useState<StatsData>({
    total_interviews: 0,
    completed_interviews: 0,
    upcoming_interviews: 0,
    average_score: 0,
    current_streak: 0,
    avg_technical: 0,
    avg_communication: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = decodeToken(token);
    if (payload?.email) {
      const namePart = payload.email.split("@")[0];
      setUserInitial(namePart.charAt(0).toUpperCase());
    }

    Promise.all([
      apiFetch("/dashboard/stats").then((r) => (r.ok ? r.json() : null)),
      apiFetch("/interviews").then((r) => (r.ok ? r.json() : [])),
      apiFetch("/profile").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(async ([s, ivs, profile]) => {
        if (s) setStats(s);
        if (ivs) {
          setInterviews(ivs);
          const completed = ivs.filter((i: any) => i.status === "completed");
          
          // Fetch results for completed interviews
          const resultsPromises = completed.map((i: any) =>
            apiFetch(`/interviews/${i.id}/result`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
          );
          const fetchedResults = (await Promise.all(resultsPromises)).filter(Boolean);
          setResults(fetchedResults);

          // Get latest result
          if (fetchedResults.length > 0) {
            const sortedResults = [...fetchedResults].sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
            setLatestResult(sortedResults[0]);
          }
        }
        if (profile?.name) setUserInitial(profile.name.charAt(0).toUpperCase());
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Computations ──────────────────────────────────────────────────────────

  const completedCount = results.length;

  // Gauge values (aggregated, default to 0 if no interviews)
  const scoreOverall = completedCount > 0
    ? (results.reduce((sum, r) => sum + (r.overall_score || 0), 0) / completedCount) * 10
    : 0;

  const scoreTechnical = completedCount > 0
    ? (results.reduce((sum, r) => sum + (r.technical_score || r.overall_score || 0), 0) / completedCount) * 10
    : 0;

  const scoreCommunication = completedCount > 0
    ? (results.reduce((sum, r) => sum + (r.communication_score || r.overall_score || 0), 0) / completedCount) * 10
    : 0;

  const scoreProblemSolving = scoreTechnical * 0.95;
  const scoreConfidence = scoreCommunication * 0.9;

  // Performance performance comment
  let performanceComment = "No evaluations completed yet";
  if (completedCount > 0) {
    if (scoreOverall >= 85) performanceComment = "Excellent Performance!";
    else if (scoreOverall >= 75) performanceComment = "Great Performance!";
    else if (scoreOverall >= 60) performanceComment = "Good Progress, Keep Practicing!";
    else performanceComment = "Needs Focus and Consistency";
  }

  // Strengths, Weaknesses, Suggestions lists from latest evaluation
  const strengths = latestResult?.strengths && latestResult.strengths.length > 0
    ? latestResult.strengths
    : completedCount > 0 ? ["Strong domain knowledge", "Professional delivery"] : [];

  const areasToImprove = latestResult?.weaknesses && latestResult.weaknesses.length > 0
    ? latestResult.weaknesses
    : completedCount > 0 ? ["Structure answers using STAR", "Elaborate with concrete examples"] : [];

  // Generate dynamic AI suggestions based on performance
  const suggestions = [];
  if (completedCount > 0) {
    if (scoreTechnical < 80) {
      suggestions.push("Practice more coding and DSA problems");
      suggestions.push("Review core engineering & software architecture principles");
    }
    if (scoreCommunication < 80) {
      suggestions.push("Focus on explanation pacing and voice clarity");
      suggestions.push("Practice summarizing ideas concisely under time limits");
    }
    if (scoreProblemSolving < 80) {
      suggestions.push("Improve structured approach to technical problems");
    }
    suggestions.push("Take more mock interviews to gain confidence");
  }

  // Performance Trend (last 8 sessions)
  const trendPoints = [...results]
    .sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
    .slice(-8)
    .map((r: any, idx: number) => {
      const scorePct = (r.overall_score || 0) * 10;
      const x = results.slice(-8).length > 1 ? 50 + idx * ((450 - 50) / (results.slice(-8).length - 1)) : 250;
      const y = 30 + (1 - scorePct / 100) * 120;
      const dateStr = r.created_at
        ? new Date(r.created_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      return { x, y, label: dateStr, val: scorePct };
    });

  const trendLinePath = trendPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const trendAreaPath = trendPoints.length > 0 ? `${trendLinePath} L ${trendPoints[trendPoints.length - 1].x} 150 L ${trendPoints[0].x} 150 Z` : "";

  // Trigger print/download report
  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6 print:ml-0 print:p-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">AI Feedback</h1>
            <p className="text-slate-400 text-xs mt-1">Personalized evaluation report generated by AI 🧠</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-xl border border-[#1F223D] bg-[#13162C] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-[#5c4ae4] focus:ring-1 focus:ring-[#5c4ae4]/20"
              />
            </div>

            <button className="relative p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-300 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#5c4ae4]" />
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={completedCount === 0}
              className="flex items-center gap-1.5 bg-[#13162C] border border-[#1F223D] text-xs text-slate-300 px-4 py-2 rounded-xl hover:text-white active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Download Report
            </button>

            <Link
              href="/account"
              className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-md"
            >
              {userInitial}
            </Link>
          </div>
        </div>

        {/* ── Gauges Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Overall Score */}
          <div className="flex flex-col items-center justify-between bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Overall Score</span>
            <div className="relative h-24 w-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="36" className="stroke-[#1F223D]" strokeWidth="5" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  className="stroke-[#10B981]"
                  strokeWidth="5"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 - (scoreOverall / 100) * (2 * Math.PI * 36)}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{
                    transition: "stroke-dashoffset 1s ease-out",
                    filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.25))",
                  }}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-black text-white">{Math.round(scoreOverall)}</span>
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">/ 100</span>
              </div>
            </div>
            <p className={`text-[10px] mt-3 font-bold uppercase tracking-wide ${
              scoreOverall >= 75 ? "text-[#10B981]" : scoreOverall >= 60 ? "text-yellow-400" : "text-red-400"
            }`}>
              {performanceComment}
            </p>
          </div>

          {/* Technical */}
          <RadialGauge score={scoreTechnical} label="Technical" color="stroke-[#10B981]" shadowColor="rgba(16, 185, 129, 0.25)" />
          {/* Communication */}
          <RadialGauge score={scoreCommunication} label="Communication" color="stroke-[#06B6D4]" shadowColor="rgba(6, 182, 212, 0.25)" />
          {/* Problem Solving */}
          <RadialGauge score={scoreProblemSolving} label="Problem Solving" color="stroke-[#A855F7]" shadowColor="rgba(168, 85, 247, 0.25)" />
          {/* Confidence */}
          <RadialGauge score={scoreConfidence} label="Confidence" color="stroke-[#6366F1]" shadowColor="rgba(99, 102, 241, 0.25)" />
        </div>

        {/* ── Strengths, Improvements & Suggestions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strengths */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <CheckCircle className="h-4 w-4" /> Strengths
            </h3>
            {strengths.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No feedback session graded yet</p>
            ) : (
              <ul className="space-y-3">
                {strengths.map((str: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Areas to Improve */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <AlertCircle className="h-4 w-4" /> Areas to Improve
            </h3>
            {areasToImprove.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No feedback session graded yet</p>
            ) : (
              <ul className="space-y-3">
                {areasToImprove.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Suggestions */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg">
            <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Lightbulb className="h-4 w-4" /> AI Suggestions
            </h3>
            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Complete sessions to get suggestions</p>
            ) : (
              <ul className="space-y-3">
                {suggestions.map((sug: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Performance Trend & Score Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Trend (2/3 width) */}
          <div className="lg:col-span-2 bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Performance Trend</h3>
            </div>

            <div className="h-56 mt-4 relative flex items-center justify-center">
              {results.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <TrendingUp className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400">No performance data yet</span>
                  <span className="text-[10px] text-slate-600">Complete sessions to see trends</span>
                </div>
              ) : (
                <svg viewBox="0 0 500 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((v: number) => {
                    const y = 30 + (1 - v / 100) * 120;
                    return (
                      <g key={v}>
                        <line x1="50" y1={y} x2="480" y2={y} stroke="#1F223D" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="35" y={y + 3} fill="#565B7F" fontSize="8" textAnchor="end">{v}%</text>
                      </g>
                    );
                  })}
                  {/* Paths */}
                  <path d={trendAreaPath} fill="url(#trendAreaGrad)" />
                  <path d={trendLinePath} fill="none" stroke="url(#trendLineGrad)" strokeWidth="3" strokeLinecap="round" />
                  {/* Points */}
                  {trendPoints.map((p: any, i: number) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#13162C" stroke="#a855f7" strokeWidth="2.5" />
                      <circle cx={p.x} cy={p.y} r="2" fill="#fff" />
                      <text x={p.x} y="165" fill="#565B7F" fontSize="8" textAnchor="middle">{p.label}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>

          {/* Score Breakdown (1/3 width - vertical bars) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Score Breakdown</h3>
            </div>

            <div className="h-56 mt-4 relative">
              <svg viewBox="0 0 200 150" className="w-full h-full">
                {/* Grid lines */}
                {[0, 50, 100].map((v: number) => {
                  const y = 110 - (v / 100) * 90;
                  return (
                    <g key={v}>
                      <line x1="25" y1={y} x2="190" y2={y} stroke="#1F223D" strokeWidth="1" />
                      <text x="18" y={y + 3} fill="#565B7F" fontSize="8" textAnchor="end">{v}%</text>
                    </g>
                  );
                })}
                {/* Bars */}
                {[
                  { l: "Technical", v: scoreTechnical },
                  { l: "Comm.", v: scoreCommunication },
                  { l: "Problem", v: scoreProblemSolving },
                  { l: "Confidence", v: scoreConfidence },
                ].map((item: any, idx: number) => {
                  const barHeight = (item.v / 100) * 90;
                  const x = 35 + idx * 40;
                  const y = 110 - barHeight;
                  return (
                    <g key={item.l}>
                      <rect
                        x={x}
                        y={y}
                        width="18"
                        height={barHeight}
                        rx="3"
                        fill="url(#breakdownBarGrad)"
                      />
                      <text x={x + 9} y="125" fill="#565B7F" fontSize="7" textAnchor="middle">{item.l}</text>
                    </g>
                  );
                })}
                {/* Gradient Definitions */}
                <defs>
                  <linearGradient id="breakdownBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
