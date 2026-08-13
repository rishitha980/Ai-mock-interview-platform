"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  Award,
  Star,
  Zap,
  Trophy,
  Target,
  Flame,
  TrendingUp,
  CheckCircle2,
  Lock,
  Bell,
  Search,
  ChevronRight,
  Sparkles,
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

const BADGE_DEFS = [
  {
    id: "first_interview",
    title: "First Interview",
    description: "Completed your first interview",
    icon: Star,
    color: "text-orange-400",
    bg: "border-orange-500/30",
    ring: "ring-orange-500/40",
    gradient: "from-orange-600 to-red-600",
    xp: 50,
    check: (s: StatsData, _ivs: any[]) => s.completed_interviews >= 1,
  },
  {
    id: "seven_day_streak",
    title: "7-Day Streak",
    description: "Completed interviews for 7 days",
    icon: Flame,
    color: "text-purple-400",
    bg: "border-purple-500/30",
    ring: "ring-purple-500/40",
    gradient: "from-purple-600 to-indigo-600",
    xp: 150,
    check: (s: StatsData, _ivs: any[]) => s.current_streak >= 7,
  },
  {
    id: "top_performer",
    title: "Top Performer",
    description: "Scored above 80% on an interview",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "border-yellow-500/30",
    ring: "ring-yellow-500/40",
    gradient: "from-yellow-500 to-orange-500",
    xp: 200,
    check: (_s: StatsData, ivs: any[]) => ivs.some((i) => i.status === "completed" && (i.score || 0) >= 8),
  },
  {
    id: "fast_learner",
    title: "Fast Learner",
    description: "Completed 10 interviews",
    icon: Zap,
    color: "text-green-400",
    bg: "border-green-500/30",
    ring: "ring-green-500/40",
    gradient: "from-green-500 to-teal-500",
    xp: 300,
    check: (s: StatsData, _ivs: any[]) => s.completed_interviews >= 10,
  },
  {
    id: "interview_master",
    title: "Interview Master",
    description: "Completed 20 interviews",
    icon: Award,
    color: "text-orange-400",
    bg: "border-orange-500/30",
    ring: "ring-orange-500/40",
    gradient: "from-orange-500 to-rose-500",
    xp: 500,
    check: (s: StatsData, _ivs: any[]) => s.completed_interviews >= 20,
  },
  {
    id: "high_achiever",
    title: "High Achiever",
    description: "Average score above 75%",
    icon: Target,
    color: "text-cyan-400",
    bg: "border-cyan-500/30",
    ring: "ring-cyan-500/40",
    gradient: "from-cyan-500 to-blue-500",
    xp: 250,
    check: (s: StatsData, _ivs: any[]) => s.average_score >= 7.5,
  },
  {
    id: "consistent",
    title: "Consistency King",
    description: "14-day streak",
    icon: TrendingUp,
    color: "text-indigo-400",
    bg: "border-indigo-500/30",
    ring: "ring-indigo-500/40",
    gradient: "from-indigo-500 to-violet-500",
    xp: 400,
    check: (s: StatsData, _ivs: any[]) => s.current_streak >= 14,
  },
  {
    id: "completionist",
    title: "Completionist",
    description: "100% completion rate (5+ interviews)",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "border-emerald-500/30",
    ring: "ring-emerald-500/40",
    gradient: "from-emerald-500 to-green-600",
    xp: 350,
    check: (s: StatsData, _ivs: any[]) => s.total_interviews >= 5 && s.completed_interviews === s.total_interviews,
  },
  {
    id: "perfectionist",
    title: "Perfectionist",
    description: "Scored 90% or above on any interview",
    icon: Sparkles,
    color: "text-pink-400",
    bg: "border-pink-500/30",
    ring: "ring-pink-500/40",
    gradient: "from-pink-500 to-rose-500",
    xp: 450,
    check: (_s: StatsData, ivs: any[]) => ivs.some((i) => i.status === "completed" && (i.score || 0) >= 9),
  },
];

function getLevel(xp: number) {
  const thresholds = [0, 200, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000];
  const titles = ["Rookie", "Beginner", "Learner", "Practitioner", "Expert", "Senior", "Master", "Elite", "Legend", "Champion"];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) {
      return {
        level: i + 1,
        title: titles[i],
        currentXp: xp - thresholds[i],
        nextXp: thresholds[i + 1] ? thresholds[i + 1] - thresholds[i] : 0,
      };
    }
  }
  return { level: 1, title: "Rookie", currentXp: 0, nextXp: 200 };
}

export default function AchievementsPage() {
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

  const earnedBadges = BADGE_DEFS.filter((b) => b.check(stats, interviews));
  const lockedBadges = BADGE_DEFS.filter((b) => !b.check(stats, interviews));
  const totalXp = earnedBadges.reduce((sum, b) => sum + b.xp, 0);
  const { level, title: levelTitle, currentXp, nextXp } = getLevel(totalXp);
  const globalRank =
    stats.completed_interviews > 0
      ? Math.max(1, Math.round(10000 / (1 + stats.completed_interviews * 0.5 + stats.average_score * 2)))
      : 9999;
  const recentAchievements = earnedBadges.slice(-5).reverse();
  const progressPct = nextXp > 0 ? Math.min(100, Math.round((currentXp / nextXp) * 100)) : 100;

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Achievements</h1>
            <p className="text-slate-400 text-xs mt-1">Track your progress and earn badges 🏆</p>
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

            <Link
              href="/account"
              className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-md"
            >
              {userInitial}
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Badges",
              value: String(earnedBadges.length),
              sub: `Out of ${BADGE_DEFS.length} badges`,
              color: "text-[#6366F1]",
              subColor: "text-slate-400",
            },
            {
              label: "Current Level",
              value: `Level ${level}`,
              sub: levelTitle,
              color: "text-yellow-400",
              subColor: "text-yellow-400 font-bold",
            },
            {
              label: "XP Points",
              value: totalXp.toLocaleString(),
              sub: earnedBadges.length > 0 ? `+${earnedBadges[earnedBadges.length - 1]?.xp ?? 0} XP recent` : "Earn your first badge",
              color: "text-[#10B981]",
              subColor: "text-[#10B981]",
            },
            {
              label: "Global Rank",
              value: `#${globalRank.toLocaleString()}`,
              sub: stats.completed_interviews > 5 ? "Top 5%" : "Keep practicing",
              color: "text-[#F59E0B]",
              subColor: "text-slate-400",
            },
          ].map(({ label, value, sub, color, subColor }) => (
            <div key={label} className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
              <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
              <p className={`text-[10px] mt-3 font-semibold ${subColor}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Achievements Badges */}
        <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-200 tracking-wide">Your Achievements</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">{earnedBadges.length} earned · {lockedBadges.length} remaining</p>
            </div>
            <span className="text-[10px] font-bold text-[#6366F1] bg-[#6366F1]/10 border border-[#6366F1]/20 px-3 py-1 rounded-full">
              {earnedBadges.length}/{BADGE_DEFS.length} unlocked
            </span>
          </div>

          {loading ? (
            <div className="flex gap-4 pb-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="shrink-0 w-36 bg-[#0C0E20]/60 border border-[#1F223D] rounded-xl p-4 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-[#1F223D] mx-auto mb-3" />
                  <div className="h-2 bg-[#1F223D] rounded w-3/4 mx-auto mb-2" />
                  <div className="h-2 bg-[#1F223D] rounded w-full mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {earnedBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`relative group shrink-0 w-36 bg-[#0C0E20]/60 border ${badge.bg} rounded-xl p-4 flex flex-col items-center text-center transition-all hover:scale-105 cursor-default`}
                  >
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-lg ring-2 ${badge.ring} mb-3`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <p className={`text-xs font-black ${badge.color} leading-tight`}>{badge.title}</p>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">{badge.description}</p>
                    <span className="mt-2 text-[8px] font-bold bg-[#6366F1]/15 text-[#818CF8] px-2 py-0.5 rounded-full border border-[#6366F1]/20">
                      +{badge.xp} XP
                    </span>
                    <span className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-[#0C0E20] flex items-center justify-center">
                      <svg className="w-2 h-2" viewBox="0 0 8 8">
                        <path d="M1.5 4l2 2 3-3.5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                );
              })}

              {lockedBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="relative shrink-0 w-36 bg-[#0C0E20]/40 border border-[#1F223D]/60 rounded-xl p-4 flex flex-col items-center text-center opacity-50 cursor-not-allowed"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#1F223D] flex items-center justify-center ring-2 ring-[#1F223D]/40 mb-3 relative">
                      <Icon className="h-7 w-7 text-slate-600" />
                      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-[#0C0E20]/60">
                        <Lock className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <p className="text-xs font-black text-slate-500 leading-tight">{badge.title}</p>
                    <p className="text-[9px] text-slate-600 mt-1 leading-tight">{badge.description}</p>
                    <span className="mt-2 text-[8px] font-bold bg-[#1F223D]/60 text-slate-500 px-2 py-0.5 rounded-full border border-[#1F223D]">
                      +{badge.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Level Progress */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-[#6366F1]" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Level Progress</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-black text-white">Level {level}</p>
                  <p className="text-[10px] text-yellow-400 font-bold mt-0.5">{levelTitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">
                    {totalXp.toLocaleString()} / {(totalXp - currentXp + nextXp).toLocaleString()} XP
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {nextXp > 0 ? `${(nextXp - currentXp).toLocaleString()} XP to go` : "Max level!"}
                  </p>
                </div>
              </div>
              <div className="relative h-3 bg-[#0C0E20] rounded-full overflow-hidden border border-[#1F223D]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg,#6366f1,#a855f7,#06b6d4)",
                    boxShadow: "0 0 10px rgba(99,102,241,.5)",
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Prev Level", v: totalXp - currentXp, c: "text-slate-500" },
                  { l: "Current XP", v: totalXp, c: "text-[#6366F1]" },
                  { l: "Next Level", v: totalXp - currentXp + nextXp, c: "text-slate-500" },
                ].map(({ l, v, c }) => (
                  <div key={l} className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-2.5 text-center">
                    <p className={`text-xs font-black ${c}`}>{v.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-[#1F223D]/60">
                <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest font-bold">Recent Badges</p>
                <div className="space-y-1.5">
                  {earnedBadges.length === 0 ? (
                    <p className="text-[10px] text-slate-600 text-center py-2">Complete interviews to earn XP</p>
                  ) : (
                    earnedBadges
                      .slice(-3)
                      .reverse()
                      .map((b) => {
                        const Icon = b.icon;
                        return (
                          <div key={b.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${b.gradient} flex items-center justify-center`}>
                                <Icon className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-[10px] text-slate-300 font-semibold">{b.title}</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#818CF8]">+{b.xp} XP</span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#F59E0B]" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Achievements</h3>
              </div>
              <Link href="/interview/create" className="text-[10px] font-bold text-[#6366F1] hover:underline flex items-center gap-0.5">
                Earn more <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {recentAchievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Trophy className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-xs font-bold text-slate-400">No achievements yet</p>
                <p className="text-[10px] text-slate-600 mt-1 text-center">Complete your first interview to unlock badges</p>
                <Link
                  href="/interview/create"
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-[10px] font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  Start Interview
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAchievements.map((badge, idx) => {
                  const Icon = badge.icon;
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={badge.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isLatest ? "bg-[#6366F1]/10 border-[#6366F1]/25" : "bg-[#0C0E20]/40 border-[#1F223D]/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-lg shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${badge.color}`}>{badge.title}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{badge.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black ${badge.color}`}>+{badge.xp} XP</span>
                        <p className="text-[9px] text-slate-500 mt-0.5">{isLatest ? "Today" : "Earned"}</p>
                      </div>
                    </div>
                  );
                })}
                {lockedBadges.length > 0 &&
                  (() => {
                    const next = lockedBadges[0];
                    const Icon = next.icon;
                    return (
                      <div className="pt-3 border-t border-[#1F223D]/60">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2">Up Next</p>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-[#1F223D]/40 bg-[#0C0E20]/20 opacity-60">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1F223D] flex items-center justify-center relative shrink-0">
                              <Icon className="h-5 w-5 text-slate-600" />
                              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-[#0C0E20]/50">
                                <Lock className="h-3 w-3 text-slate-500" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-400">{next.title}</p>
                              <p className="text-[9px] text-slate-600 mt-0.5">{next.description}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-500">+{next.xp} XP</span>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#A855F7]" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Progress Summary</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Interviews Done", value: stats.completed_interviews, max: 20, suffix: "", color: "#6366F1" },
              { label: "Avg Score", value: Math.round((stats.average_score / 10) * 100), max: 100, suffix: "%", color: "#10B981" },
              { label: "Day Streak", value: stats.current_streak, max: 14, suffix: "", color: "#F59E0B" },
              { label: "Badges Earned", value: earnedBadges.length, max: BADGE_DEFS.length, suffix: "", color: "#A855F7" },
            ].map(({ label, value, max, suffix, color }) => {
              const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
              return (
                <div key={label} className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-black text-white">
                      {value}
                      {suffix}
                      <span className="text-slate-500 font-medium">
                        /{max}
                        {suffix}
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#0C0E20] rounded-full overflow-hidden border border-[#1F223D]">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-600 mt-1.5 text-right font-semibold">{pct}% complete</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
