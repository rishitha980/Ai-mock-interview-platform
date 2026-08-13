"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Bot, Star, TrendingUp, ChevronRight } from "lucide-react";
import { useTheme } from "./ThemeProvider";

const skillBars = [
  { label: "Communication", value: 90, color: "#6C47FF" },
  { label: "Problem Solving", value: 85, color: "#10B981" },
  { label: "Technical", value: 80, color: "#F59E0B" },
  { label: "Confidence", value: 70, color: "#06B6D4" },
];

const scorePoints = [
  { x: 30, y: 90 },
  { x: 110, y: 60 },
  { x: 170, y: 75 },
  { x: 230, y: 40 },
  { x: 280, y: 25 },
];

export default function Hero() {
  const { theme } = useTheme();
  const canvasRef = useRef<SVGPathElement>(null);

  const linePath = scorePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${scorePoints[scorePoints.length - 1].x} 110 L ${scorePoints[0].x} 110 Z`;

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#6C47FF]/15 dark:bg-[#6C47FF]/10 blur-[120px] transition-all" />
        <div className="absolute top-[10%] right-[-15%] w-[500px] h-[500px] rounded-full bg-[#A855F7]/10 dark:bg-[#A855F7]/5 blur-[100px] transition-all" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#06B6D4]/10 dark:bg-[#06B6D4]/5 blur-[80px] transition-all" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              theme === "dark"
                ? "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)"
                : "linear-gradient(rgba(15,23,42,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left space-y-6 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6C47FF]/15 border border-[#6C47FF]/30 text-xs font-semibold text-indigo-600 dark:text-[#A78BFA]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] animate-pulse" />
              Powered by AI · Personalized for You
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              Ace Your Dream Job<br />
              with <span className="gradient-text">AI Mock Interviews</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
              Practice role-specific questions, receive immediate AI-generated feedback on body language, communication, and answers, and track your progress.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="btn-primary text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 w-full sm:w-auto text-center"
              >
                Start Practice Free
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-350 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer">
                <span className="w-5 h-5 rounded-full bg-[#6C47FF] flex items-center justify-center text-white text-[10px]">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </span>
                Watch Demo
              </button>
            </div>

            {/* Social Trust */}
            <div className="flex items-center justify-center lg:justify-start gap-3 pt-2">
              <div className="flex -space-x-2">
                {["R", "P", "A", "S"].map((initial, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white shadow-sm"
                    style={{
                      background: ["#6C47FF", "#10B981", "#F59E0B", "#06B6D4"][i],
                    }}
                  >
                    {initial}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-medium">
                  Trusted by <span className="text-slate-900 dark:text-white font-bold">10,000+</span> students & professionals
                </span>
              </div>
            </div>
          </div>

          {/* Right: Bot Widget + Score Card */}
          <div className="relative flex flex-col items-center gap-4 animate-slide-in-right delay-200">
            {/* Main Bot Card */}
            <div className="relative w-full max-w-sm mx-auto">
              {/* Score Card (top-right floating) */}
              <div className="absolute -top-6 -right-4 z-20 glass-card rounded-2xl p-4 shadow-xl shadow-slate-200/10 dark:shadow-black/30 w-48 animate-float">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Interview Score
                  </span>
                  <TrendingUp className="w-3 h-3 text-[#10B981]" />
                </div>
                {/* Circular Score */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                      <circle
                        cx="21"
                        cy="21"
                        r="17"
                        fill="none"
                        stroke="rgba(108,71,255,0.15)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="21"
                        cy="21"
                        r="17"
                        fill="none"
                        stroke="url(#scoreGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="106.8"
                        strokeDashoffset="22"
                        className="animate-score-fill"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6C47FF" />
                          <stop offset="100%" stopColor="#A855F7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                      <span className="text-lg font-black text-slate-900 dark:text-white leading-none">85</span>
                      <span className="text-[8px] text-slate-500 font-medium">/100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#10B981]">Great Performance!</p>
                    {/* Mini sparkline */}
                    <svg width="70" height="24" viewBox="0 0 300 110" className="mt-1">
                      <defs>
                        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6C47FF" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#6C47FF" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#sparkArea)" />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#6C47FF"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bot Avatar Card */}
              <div className="glass-card rounded-3xl p-6 pt-10 shadow-2xl shadow-[#6C47FF]/10 dark:shadow-[#6C47FF]/20 border border-slate-200/50 dark:border-[#6C47FF]/20 text-center">
                {/* Robot Illustration */}
                <div className="w-28 h-28 mx-auto mb-4 relative animate-float">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6C47FF] to-[#A855F7] flex items-center justify-center shadow-xl shadow-[#6C47FF]/40 animate-pulse-glow">
                    <Bot className="w-14 h-14 text-white" />
                  </div>
                  {/* Orbit ring */}
                  <div className="absolute inset-[-8px] rounded-full border-2 border-dashed border-[#6C47FF]/30 animate-spin-slow" />
                  {/* Status dot */}
                  <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#10B981] border-2 border-card flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping absolute" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">AI Interviewer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Ready to conduct your interview</p>

                <div className="bg-[#6C47FF]/10 border border-[#6C47FF]/20 rounded-xl px-4 py-2.5 text-xs font-semibold text-indigo-650 dark:text-[#A78BFA]">
                  💡 Let&apos;s boost your interview skills!
                </div>
              </div>

              {/* Skills Card (bottom-left floating) */}
              <div className="absolute -bottom-8 -left-4 z-20 glass-card rounded-2xl p-4 shadow-xl shadow-slate-200/10 dark:shadow-black/30 w-52">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                  Top Skills
                </p>
                <div className="space-y-2">
                  {skillBars.map((skill) => (
                    <div key={skill.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{skill.label}</span>
                        <span className="text-[10px] font-bold" style={{ color: skill.color }}>{skill.value}%</span>
                      </div>
                      <div className="h-1 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${skill.value}%`,
                            background: skill.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
