"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  FileText,
  ExternalLink,
  Timer,
  Mic,
  Calendar,
  Search,
  Bell,
  User,
  ShieldAlert,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Developer");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("D");
  const [currentTime, setCurrentTime] = useState(0);

  const [stats, setStats] = useState({
    total_interviews: 0,
    completed_interviews: 0,
    upcoming_interviews: 0,
    average_score: 0.0,
    current_streak: 0,
    avg_technical: 0.0,
    avg_communication: 0.0,
  });

  useEffect(() => {
    setCurrentTime(Date.now());
    const clockInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = decodeToken(token);
    if (payload?.email) {
      setUserEmail(payload.email);
      const namePart = payload.email.split("@")[0];
      setUserName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
      setUserInitial(namePart.charAt(0).toUpperCase());
    }

    fetchProfile();
    fetchInterviews();
    fetchStats();

    return () => clearInterval(clockInterval);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/profile");
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name);
        if (data.name) {
          setUserInitial(data.name.charAt(0).toUpperCase());
        }
      }
    } catch {}
  };

  const fetchInterviews = async () => {
    try {
      const res = await apiFetch("/interviews");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInterviews(data.reverse());
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this interview record?")) return;
    try {
      await apiFetch(`/interviews/${id}`, { method: "DELETE" });
      fetchInterviews();
      fetchStats();
    } catch {}
  };

  const formatCountdown = (targetTs: number) => {
    const diffSec = Math.floor((targetTs * 1000 - currentTime) / 1000);
    if (diffSec <= 0) return "Ready to start";
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (h > 0) return `Starts in ${h}h ${m}m`;
    if (m > 0) return `Starts in ${m}m ${s}s`;
    return `Starts in ${s}s`;
  };

  // Computations
  const bestScore = interviews.filter((i) => i.status === "completed").reduce((max, i) => Math.max(max, i.score || 0), 0);
  const totalTimeMin = interviews.filter((i) => i.status === "completed").length * 35;
  const avgPercent = stats.average_score ? Math.round((stats.average_score / 10) * 100) : 0;

  // Completed sessions
  const completed = interviews.filter((i) => i.status === "completed").reverse();

  // Custom SVG Radar Coordinates
  const radarCenter = 110;
  const radarRadius = 70;
  const getRadarPoint = (index: number, value: number) => {
    const angle = (index * 72 - 90) * (Math.PI / 180);
    const valRatio = value / 100;
    const r = radarRadius * valRatio;
    return {
      x: radarCenter + r * Math.cos(angle),
      y: radarCenter + r * Math.sin(angle),
    };
  };

  const getClampedVal = (val: number) => Math.min(100, Math.max(0, val));

  const skillsData = [
    { label: "Communication", val: getClampedVal(stats.avg_communication ? Math.round(stats.avg_communication * 10) : 0) },
    { label: "Problem Solving", val: getClampedVal(stats.avg_technical ? Math.round(stats.avg_technical * 10) : 0) },
    { label: "Confidence", val: getClampedVal(stats.avg_communication ? Math.round(stats.avg_communication * 9.5) : 0) },
    { label: "Technical", val: getClampedVal(stats.avg_technical ? Math.round(stats.avg_technical * 10) : 0) },
    { label: "Behavioral", val: getClampedVal(stats.average_score ? Math.round(stats.average_score * 10) : 0) },
  ];

  const radarPoints = skillsData.map((d, i) => getRadarPoint(i, d.val));
  const radarPolygonPath = radarPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Custom SVG Doughnut values
  const totalInterviewsCount = stats.total_interviews || 0;
  const techCount = totalInterviewsCount > 0 ? interviews.filter((i) => i.status === "completed" && (i.role?.toLowerCase().includes("engineer") || i.role?.toLowerCase().includes("developer") || i.role?.toLowerCase().includes("tech"))).length : 0;
  const codingCount = totalInterviewsCount > 0 ? interviews.filter((i) => i.status === "completed" && i.score).length : 0;
  const behaviorCount = totalInterviewsCount > 0 ? interviews.filter((i) => i.status === "completed" && i.difficulty_level === "Hard").length : 0;
  const hrCount = totalInterviewsCount > 0 ? Math.max(0, totalInterviewsCount - (techCount + codingCount + behaviorCount)) : 0;

  const totalTypes = techCount + behaviorCount + hrCount + codingCount;
  const techPct = totalTypes > 0 ? techCount / totalTypes : 0;
  const behaviorPct = totalTypes > 0 ? behaviorCount / totalTypes : 0;
  const hrPct = totalTypes > 0 ? hrCount / totalTypes : 0;
  const codingPct = totalTypes > 0 ? codingCount / totalTypes : 0;

  const circ = 2 * Math.PI * 40;
  const techOffset = 0;
  const behaviorOffset = techPct * circ;
  const hrOffset = (techPct + behaviorPct) * circ;
  const codingOffset = (techPct + behaviorPct + hrPct) * circ;

  // Chronologically sorted completed interviews (last 6)
  const completedSorted = [...interviews]
    .filter((i) => i.status === "completed")
    .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
    .slice(-6);

  const points = completedSorted.map((item, idx) => {
    const scorePct = (item.score || 0) * 10;
    const x = completedSorted.length > 1 ? 40 + idx * ((480 - 40) / (completedSorted.length - 1)) : 260;
    const y = 20 + (1 - scorePct / 100) * 110;
    const dateStr = item.created_at 
      ? new Date(item.created_at * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    return { x, y, label: dateStr };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z` : "";

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Dashboard</h1>
            <p className="text-slate-400 text-xs mt-1">Welcome back, {userName} 👋</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
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

            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-300 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#5c4ae4]" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer"
              >
                {userInitial}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Total Interviews",
              value: stats.total_interviews !== undefined ? stats.total_interviews : 0,
              sub: "All time",
              up: null,
              color: "text-[#6366F1]",
              bg: "bg-[#6366F1]/10 border-[#6366F1]/20",
            },
            {
              label: "Average Score",
              value: `${avgPercent}%`,
              sub: "Based on completions",
              up: null,
              color: "text-[#10B981]",
              bg: "bg-[#10B981]/10 border-[#10B981]/20",
            },
            {
              label: "Completed",
              value: stats.completed_interviews !== undefined ? stats.completed_interviews : 0,
              sub: "Successfully finished",
              up: null,
              color: "text-[#A855F7]",
              bg: "bg-[#A855F7]/10 border-[#A855F7]/20",
            },
            {
              label: "Upcoming",
              value: stats.upcoming_interviews !== undefined ? stats.upcoming_interviews : 0,
              sub: "Scheduled sessions",
              up: null,
              color: "text-[#06B6D4]",
              bg: "bg-[#06B6D4]/10 border-[#06B6D4]/20",
            },
            {
              label: "Current Streak",
              value: `${stats.current_streak !== undefined ? stats.current_streak : 0} Days`,
              sub: "Consecutive days",
              up: null,
              color: "text-[#F59E0B]",
              bg: "bg-[#F59E0B]/10 border-[#F59E0B]/20",
            },
          ].map(({ label, value, sub, up, color, bg }) => (
            <div key={label} className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
                <p className="text-2xl font-black text-white mt-2">{value}</p>
              </div>
              <p className={`text-[10px] mt-3 flex items-center gap-1 font-semibold ${
                up === null ? "text-slate-400" : up ? "text-[#10B981]" : "text-[#EF4444]"
              }`}>
                {up !== null && (up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Overview (Line Chart) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#6366F1]" /> Performance Overview
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Mock session scores over time</p>
            </div>

            <div className="h-44 mt-4 relative flex items-center justify-center">
              {completedSorted.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <TrendingUp className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400">No performance data yet</span>
                  <span className="text-[10px] text-slate-600">Complete an interview to see trends</span>
                </div>
              ) : (
                <svg viewBox="0 0 500 160" className="w-full h-full">
                  <defs>
                    <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Horizontal Grid lines */}
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = 20 + (1 - v / 100) * 110;
                    return (
                      <g key={v}>
                        <line x1="40" y1={y} x2="490" y2={y} stroke="#1F223D" strokeWidth="1" strokeDasharray="3,3" />
                        <text x="30" y={y + 3} fill="#565B7F" fontSize="8" fontFamily="monospace" textAnchor="end">{v}%</text>
                      </g>
                    );
                  })}
                  {/* Graph Path */}
                  <path d={areaPath} fill="url(#scoreArea)" />
                  <path d={linePath} fill="none" stroke="url(#scoreLine)" strokeWidth="3" strokeLinecap="round" />
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#13162C" stroke="#a855f7" strokeWidth="2.5" />
                      <circle cx={p.x} cy={p.y} r="2" fill="#fff" />
                      <text x={p.x} y="150" fill="#565B7F" fontSize="8" textAnchor="middle">{p.label}</text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>

          {/* Skills Overview (Radar Chart) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 text-[#10B981]" /> Skills Overview
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Competency performance map</p>
            </div>

            <div className="flex justify-center mt-3 h-44 relative">
              {totalInterviewsCount === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <BarChart2 className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                  <span className="text-xs font-bold text-slate-400">No skills mapping yet</span>
                  <span className="text-[10px] text-slate-600">Complete an interview to see strengths</span>
                </div>
              ) : (
                <svg viewBox="0 0 220 220" className="h-full">
                  {/* Radar Grid Pentagons */}
                  {[0.25, 0.5, 0.75, 1.0].map((scale, sIdx) => {
                    const points = skillsData.map((d, i) => {
                      const angle = (i * 72 - 90) * (Math.PI / 180);
                      const r = radarRadius * scale;
                      return `${radarCenter + r * Math.cos(angle)},${radarCenter + r * Math.sin(angle)}`;
                    }).join(" ");
                    return (
                      <polygon
                        key={sIdx}
                        points={points}
                        fill="none"
                        stroke="#1F223D"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Radar Axes */}
                  {skillsData.map((d, i) => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    const outerX = radarCenter + radarRadius * Math.cos(angle);
                    const outerY = radarCenter + radarRadius * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={radarCenter}
                        y1={radarCenter}
                        x2={outerX}
                        y2={outerY}
                        stroke="#1F223D"
                        strokeWidth="1"
                      />
                    );
                  })}
                  {/* Data Polygon */}
                  <polygon
                    points={radarPolygonPath}
                    fill="rgba(99, 102, 241, 0.2)"
                    stroke="#6366F1"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    />
                  {/* Data Points */}
                  {radarPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10B981" />
                  ))}
                  {/* Labels */}
                  {skillsData.map((d, i) => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    // Push labels slightly outside vertices
                    const offsetR = radarRadius + 14;
                    const labelX = radarCenter + offsetR * Math.cos(angle);
                    const labelY = radarCenter + offsetR * Math.sin(angle) + 3;
                    let anchor: "inherit" | "end" | "middle" | "start" = "middle";
                    if (Math.cos(angle) > 0.1) anchor = "start";
                    if (Math.cos(angle) < -0.1) anchor = "end";

                    return (
                      <text
                        key={i}
                        x={labelX}
                        y={labelY}
                        fill="#8E92BC"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor={anchor}
                      >
                        {d.label}
                      </text>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Interview Types (Doughnut Chart) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-[#A855F7]" /> Interview Types
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Breakdown of practice sessions</p>
            </div>

            <div className="flex items-center justify-between gap-4 mt-4 h-44">
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Outer base track */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1F223D" strokeWidth="8" />

                  {/* Technical (Indigo) */}
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke="#6366F1"
                    strokeWidth="8"
                    strokeDasharray={`${techPct * circ} ${circ}`}
                    strokeDashoffset={-techOffset}
                    strokeLinecap="round"
                  />
                  {/* Behavioral (Green) */}
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeDasharray={`${behaviorPct * circ} ${circ}`}
                    strokeDashoffset={-behaviorOffset}
                    strokeLinecap="round"
                  />
                  {/* HR (Amber) */}
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeDasharray={`${hrPct * circ} ${circ}`}
                    strokeDashoffset={-hrOffset}
                    strokeLinecap="round"
                  />
                  {/* Coding (Cyan) */}
                  <circle
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke="#06B6D4"
                    strokeWidth="8"
                    strokeDasharray={`${codingPct * circ} ${circ}`}
                    strokeDashoffset={-codingOffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Counter Center */}
                <div className="absolute text-center">
                  <span className="text-lg font-black text-white block leading-none">{totalInterviewsCount}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">Total</span>
                </div>
              </div>

              {/* Legends */}
              <div className="flex-1 space-y-2.5">
                {[
                  { label: "Technical", val: techCount, color: "bg-[#6366F1]" },
                  { label: "Behavioral", val: behaviorCount, color: "bg-[#10B981]" },
                  { label: "HR", val: hrCount, color: "bg-[#F59E0B]" },
                  { label: "Coding", val: codingCount, color: "bg-[#06B6D4]" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold text-white">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Interviews & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Interviews Table (2 Columns wide) */}
          <div className="lg:col-span-2 bg-[#13162C] border border-[#1F223D] rounded-2xl shadow-lg overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F223D]">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Interviews</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Your active and previous sessions</p>
              </div>
              <Link
                href="/interview/create"
                className="text-[10px] text-[#6366F1] hover:underline font-bold flex items-center gap-1"
              >
                Create <Plus className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              </div>
            ) : interviews.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-[#1F223D] mb-3" />
                <p className="text-xs text-slate-500 font-bold">No interviews created yet.</p>
                <Link
                  href="/interview/create"
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-[10px] font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  <Plus className="h-3 w-3" /> Start Practice
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1F223D] text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-[#0C0E20]/20">
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Score</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F223D]/50">
                    {interviews.slice(0, 4).map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#1C2040]/30 transition-colors cursor-pointer"
                        onClick={() => router.push(item.status === "completed" ? `/interview/${item.id}/result` : `/interview/${item.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-bold text-white truncate max-w-[180px]">{item.role}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{item.experience}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-medium">
                          {item.created_at
                            ? new Date(item.created_at * 1000).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {item.status === "completed" ? `${Math.round((item.score / 10) * 100)}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "completed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25">
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25 animate-pulse">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => router.push(item.status === "completed" ? `/interview/${item.id}/result` : `/interview/${item.id}`)}
                              className="text-[10px] text-[#6366F1] hover:underline font-bold flex items-center gap-0.5"
                            >
                              {item.status === "completed" ? "View Report" : "Start"}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            <button onClick={(e) => handleDelete(item.id, e)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions (1 Column wide) */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Shortcuts to main modules</p>
            </div>

            <div className="space-y-2.5 mt-4 flex-1 flex flex-col justify-center">
              <Link
                href="/interview/create"
                className="w-full flex items-center gap-3 bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white px-4 py-3 rounded-xl shadow-sm text-xs font-bold active:scale-[0.98] transition-all justify-center"
              >
                <Plus className="w-4 h-4" /> Create Interview
              </Link>

              {[
                { label: "Upload Resume", path: "/interview/new", desc: "Start tailored session via CV" },
                { label: "Upload Job Description", path: "/dashboard/matching", desc: "Verify CV against JD parameters" },
                { label: "View Analytics", path: "/dashboard", desc: "Check core developer analytics" },
              ].map((act) => (
                <Link
                  key={act.label}
                  href={act.path}
                  className="w-full flex flex-col items-start bg-[#0C0E20]/50 hover:bg-[#0C0E20] border border-[#1F223D] text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition-all"
                >
                  <span className="text-[10px] font-bold tracking-wide">{act.label}</span>
                  <span className="text-[8px] text-slate-500 mt-0.5 leading-none">{act.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

