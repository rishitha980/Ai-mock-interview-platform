"use client";
import React from "react";
import {
  Sparkles,
  FileText,
  Mic,
  MessageSquare,
  BarChart3,
  Download,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Question Generator",
    description: "Get role specific questions tailored to your experience",
    color: "#6C47FF",
    bg: "rgba(108,71,255,0.12)",
    border: "rgba(108,71,255,0.25)",
  },
  {
    icon: FileText,
    title: "Resume Analysis",
    description: "Get ATS score, skills extraction and improvement tips",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
  },
  {
    icon: Mic,
    title: "Mock Interviews",
    description: "Text, voice & coding interviews with real-time AI",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.25)",
  },
  {
    icon: MessageSquare,
    title: "AI Feedback",
    description: "Detailed feedback with strengths and improvement areas",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track performance and improve continuously",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.25)",
  },
  {
    icon: Download,
    title: "Interview Reports",
    description: "Download reports and share your performance",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-24 bg-background transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Crack Interviews</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl mx-auto">
            A complete suite of AI-powered tools to prepare you for any interview scenario
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group glass-card rounded-2xl p-6 hover:border-slate-350 dark:hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    background: feature.bg,
                    border: `1px solid ${feature.border}`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>

                {/* Hover accent line */}
                <div
                  className="h-0.5 w-0 group-hover:w-12 transition-all duration-500 rounded-full mt-4"
                  style={{ background: feature.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
