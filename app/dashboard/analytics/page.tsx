"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  BarChart2,
  TrendingUp,
  Award,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
  ChevronDown,
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

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInitial, setUserInitial] = useState("U");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total_interviews: 0,
    completed_interviews: 0,
    upcoming_interviews: 0,
    average_score: 0,
    current_streak: 0,
    avg_technical: 0,
    avg_communication: 0,
  });
  const [timeFilter, setTimeFilter] = useState("This Month");

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
      .then(([s, ivs, profile]) => {
        if (s) setStats(s);
        if (ivs) setInterviews(ivs);
        if (profile?.name) setUserInitial(profile.name.charAt(0).toUpperCase());
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Dynamic Computations & Analytics (No Hardcoded Fallbacks) ──────────────

  // Filter completed interviews
  const completedSorted = [...interviews]
    .filter((i) => i.status === "completed")
    .sort((a, b) => (a.created_at || 0) - (b.created_at || 0));

  const totalCompletedCount = completedSorted.length;

  // 1. Score Trend points
  const scoreTrendPoints = completedSorted.slice(-8).map((item, idx) => {
    const scorePct = (item.score || 0) * 10;
    const x = completedSorted.slice(-8).length > 1 ? 50 + idx * ((450 - 50) / (completedSorted.slice(-8).length - 1)) : 250;
    const y = 30 + (1 - scorePct / 100) * 120;
    const dateStr = item.created_at
      ? new Date(item.created_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    return { x, y, label: dateStr, val: scorePct };
  });

  const linePath = scoreTrendPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = scoreTrendPoints.length > 0 ? `${linePath} L ${scoreTrendPoints[scoreTrendPoints.length - 1].x} 150 L ${scoreTrendPoints[0].x} 150 Z` : "";

  // 2. Classify Interview Types
  let techCount = 0;
  let codingCount = 0;
  let behaviorCount = 0;
  let hrCount = 0;

  completedSorted.forEach((i) => {
    const roleLower = (i.role || "").toLowerCase();
    if (roleLower.includes("coding") || roleLower.includes("algorithm") || roleLower.includes("dsa")) {
      codingCount++;
    } else if (roleLower.includes("engineer") || roleLower.includes("developer") || roleLower.includes("tech") || roleLower.includes("programmer")) {
      techCount++;
    } else if (i.difficulty_level === "Hard") {
      behaviorCount++;
    } else {
      hrCount++;
    }
  });

  const totalTypes = techCount + behaviorCount + hrCount + codingCount || 1;
  const techPct = techCount / totalTypes;
  const behaviorPct = behaviorCount / totalTypes;
  const hrPct = hrCount / totalTypes;
  const codingPct = codingCount / totalTypes;

  const circ = 2 * Math.PI * 40;
  const techOffset = 0;
  const behaviorOffset = techPct * circ;
  const hrOffset = (techPct + behaviorPct) * circ;
  const codingOffset = (techPct + behaviorPct + hrPct) * circ;

  // 3. Weekly Activity (Mon - Sun activity count)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const activityByDay = Array(7).fill(0);
  completedSorted.forEach((i) => {
    if (i.created_at) {
      const day = new Date(i.created_at * 1000).getDay();
      const index = day === 0 ? 6 : day - 1; // Map Sunday to 6, Mon-Sat to 0-5
      activityByDay[index] += 1;
    }
  });
  const maxDayCount = Math.max(...activityByDay, 4);

  // 4. Performance by Difficulty (Fully dynamic: 0% fallback if no data)
  const scoreByDiff = { Easy: { sum: 0, count: 0 }, Medium: { sum: 0, count: 0 }, Hard: { sum: 0, count: 0 } };
  completedSorted.forEach((i) => {
    const diff = i.difficulty_level || "Medium";
    const scoreVal = (i.score || 0) * 10;
    if (diff in scoreByDiff) {
      scoreByDiff[diff as keyof typeof scoreByDiff].sum += scoreVal;
      scoreByDiff[diff as keyof typeof scoreByDiff].count += 1;
    }
  });

  const perfEasy = scoreByDiff.Easy.count > 0 ? Math.round(scoreByDiff.Easy.sum / scoreByDiff.Easy.count) : 0;
  const perfMedium = scoreByDiff.Medium.count > 0 ? Math.round(scoreByDiff.Medium.sum / scoreByDiff.Medium.count) : 0;
  const perfHard = scoreByDiff.Hard.count > 0 ? Math.round(scoreByDiff.Hard.sum / scoreByDiff.Hard.count) : 0;

  // 5. Sparkline coordinates for Avg Score Sparkline
  const sparkPoints = completedSorted.slice(-12).map((item, idx) => {
    const x = completedSorted.slice(-12).length > 1 ? idx * (180 / (completedSorted.slice(-12).length - 1)) : 90;
    const y = 35 - ((item.score || 0) / 10) * 25;
    return `${x},${y}`;
  }).join(" ");

  // 6. Dynamic average score and trend calculation
  const avgPercent = totalCompletedCount > 0
    ? Math.round((completedSorted.reduce((sum, i) => sum + (i.score || 0), 0) / totalCompletedCount) * 10)
    : 0;

  // Compare average score of last 30 days vs previous 30 days
  const nowSecs = Date.now() / 1000;
  const thirtyDaysAgo = nowSecs - 30 * 24 * 3600;
  const sixtyDaysAgo = nowSecs - 60 * 24 * 3600;

  const thisMonthScores = completedSorted
    .filter((i) => i.created_at >= thirtyDaysAgo)
    .map((i) => (i.score || 0) * 10);

  const prevMonthScores = completedSorted
    .filter((i) => i.created_at >= sixtyDaysAgo && i.created_at < thirtyDaysAgo)
    .map((i) => (i.score || 0) * 10);

  const thisMonthAvg = thisMonthScores.length > 0 ? thisMonthScores.reduce((a, b) => a + b, 0) / thisMonthScores.length : 0;
  const prevMonthAvg = prevMonthScores.length > 0 ? prevMonthScores.reduce((a, b) => a + b, 0) / prevMonthScores.length : 0;

  let trendText = "No previous comparison data";
  let isPositiveTrend = true;
  let hasTrend = false;

  if (prevMonthAvg > 0 && thisMonthAvg > 0) {
    const change = Math.round(((thisMonthAvg - prevMonthAvg) / prevMonthAvg) * 100);
    hasTrend = true;
    isPositiveTrend = change >= 0;
    trendText = `${change >= 0 ? "+" : ""}${change}% vs last month`;
  } else if (thisMonthAvg > 0 && prevMonthAvg === 0) {
    trendText = "First tracked period";
  }

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Analytics</h1>
            <p className="text-slate-400 text-xs mt-1">Deep dive into your practice performance statistics 📊</p>
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

            {/* Time Filter Select */}
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none bg-[#13162C] border border-[#1F223D] text-xs text-slate-300 px-4 py-2 pr-8 rounded-xl outline-none focus:border-[#5c4ae4] cursor-pointer"
              >
                <option>This Month</option>
                <option>Last 30 Days</option>
                <option>All Time</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            <Link
              href="/account"
              className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-md"
            >
              {userInitial}
            </Link>
          </div>
        </div>

        {/* Top Grid: Score Trend & Interview Types */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Trend (2/3 width) */}
          <div className="lg:col-span-2 bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Score Trend</h3>
            </div>

            <div className="h-56 mt-4 relative flex items-center justify-center">
              {completedSorted.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <TrendingUp className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400">No performance data yet</span>
                  <span className="text-[10px] text-slate-600">Complete sessions to view stats</span>
                </div>
              ) : (
                <svg viewBox="0 0 500 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="scoreTrendArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = 30 + (1 - v / 100) * 120;
                    return (
                      <g key={v}>
                        <line x1="50" y1={y} x2="480" y2={y} stroke="#1F223D" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="35" y={y + 3} fill="#565B7F" fontSize="8" textAnchor="end">{v}%</text>
                      </g>
                    );
                  })}
                  {/* Paths */}
                  <path d={areaPath} fill="url(#scoreTrendArea)" />
                  <path d={linePath} fill="none" stroke="url(#scoreTrendGrad)" strokeWidth="3" strokeLinecap="round" />
                  {/* Points */}
                  {scoreTrendPoints.map((p, i) => (
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

          {/* Interview Types (1/3 width) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Interview Types</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1F223D" strokeWidth="8" />
                  {totalCompletedCount > 0 && (
                    <>
                      {/* Technical */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#6366F1"
                        strokeWidth="8"
                        strokeDasharray={`${techPct * circ} ${circ}`}
                        strokeDashoffset={-techOffset}
                        strokeLinecap="round"
                      />
                      {/* Behavioral */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#10B981"
                        strokeWidth="8"
                        strokeDasharray={`${behaviorPct * circ} ${circ}`}
                        strokeDashoffset={-behaviorOffset}
                        strokeLinecap="round"
                      />
                      {/* HR */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#F59E0B"
                        strokeWidth="8"
                        strokeDasharray={`${hrPct * circ} ${circ}`}
                        strokeDashoffset={-hrOffset}
                        strokeLinecap="round"
                      />
                      {/* Coding */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#06B6D4"
                        strokeWidth="8"
                        strokeDasharray={`${codingPct * circ} ${circ}`}
                        strokeDashoffset={-codingOffset}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>

                <div className="absolute text-center">
                  <span className="text-xl font-black text-white block leading-none">{totalCompletedCount}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Total</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 space-y-3">
                {[
                  { label: "Technical", val: techCount, color: "bg-[#6366F1]" },
                  { label: "Behavioral", val: behaviorCount, color: "bg-[#10B981]" },
                  { label: "HR", val: hrCount, color: "bg-[#F59E0B]" },
                  { label: "Coding", val: codingCount, color: "bg-[#06B6D4]" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold text-white">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid: Weekly Activity, Average Score, Performance by Difficulty */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Activity */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Weekly Activity</h3>
            </div>

            <div className="h-44 mt-6 relative">
              <svg viewBox="0 0 240 120" className="w-full h-full">
                {/* Horizontal grid lines */}
                {[0, 2, 4].map((v) => {
                  const y = 90 - (v / 4) * 70;
                  return (
                    <g key={v}>
                      <line x1="20" y1={y} x2="230" y2={y} stroke="#1F223D" strokeWidth="1" />
                      <text x="12" y={y + 3} fill="#565B7F" fontSize="8" textAnchor="end">{v}</text>
                    </g>
                  );
                })}
                {/* Bars */}
                {daysOfWeek.map((day, idx) => {
                  const count = activityByDay[idx];
                  const barHeight = (count / maxDayCount) * 70;
                  const x = 32 + idx * 28;
                  const y = 90 - barHeight;
                  return (
                    <g key={day}>
                      <rect
                        x={x}
                        y={y}
                        width="12"
                        height={barHeight}
                        rx="3"
                        fill="url(#barGrad)"
                        className="transition-all duration-500 hover:opacity-80"
                      />
                      <text x={x + 6} y="105" fill="#565B7F" fontSize="8" textAnchor="middle">{day}</text>
                    </g>
                  );
                })}
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Average Score</h3>
            </div>

            <div className="flex flex-col items-center justify-center my-auto py-2">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">{avgPercent}</span>
                <span className="text-xl font-bold text-slate-400">%</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${
                hasTrend ? (isPositiveTrend ? "text-[#10B981]" : "text-red-400") : "text-slate-500"
              }`}>
                {hasTrend && (isPositiveTrend ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
                <span>{trendText}</span>
              </div>
            </div>

            {/* Sparkline chart at the bottom */}
            <div className="h-10 mt-2">
              {completedSorted.length > 0 && (
                <svg viewBox="0 0 180 40" className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="2.5"
                    points={sparkPoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Performance by Difficulty */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Performance by Difficulty</h3>
            </div>

            <div className="space-y-4 mt-6">
              {[
                { label: "Easy", val: perfEasy, color: "from-[#10B981] to-[#34D399]", glow: "shadow-[#10B981]/25" },
                { label: "Medium", val: perfMedium, color: "from-[#6366F1] to-[#818CF8]", glow: "shadow-[#6366F1]/25" },
                { label: "Hard", val: perfHard, color: "from-[#F59E0B] to-[#FBBF24]", glow: "shadow-[#F59E0B]/25" },
              ].map(({ label, val, color, glow }) => (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{label}</span>
                    <span className="text-white">{val}%</span>
                  </div>
                  <div className="h-2.5 bg-[#0C0E20] rounded-full overflow-hidden border border-[#1F223D] relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
