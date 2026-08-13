"use client";
import React from "react";
import { Upload, UserCheck, Bot, Headphones, Star } from "lucide-react";

const steps = [
  {
    step: 1,
    icon: Upload,
    title: "Upload Resume",
    description: "Upload your resume in PDF format",
    color: "#6C47FF",
    bg: "rgba(108,71,255,0.15)",
    border: "rgba(108,71,255,0.35)",
  },
  {
    step: 2,
    icon: UserCheck,
    title: "Select Role",
    description: "Choose job role and experience level",
    color: "#10B981",
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.35)",
  },
  {
    step: 3,
    icon: Bot,
    title: "Generate Interview",
    description: "AI generates questions for your interview",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.35)",
  },
  {
    step: 4,
    icon: Headphones,
    title: "Take Interview",
    description: "Attempt the interview in real-time",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.35)",
  },
  {
    step: 5,
    icon: Star,
    title: "Get AI Feedback",
    description: "Get detailed feedback and improve",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.15)",
    border: "rgba(6,182,212,0.35)",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-24 bg-[var(--background-navy)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl mx-auto">
            Get started in minutes — no complicated setup required
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/10 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="flex flex-col items-center text-center group">
                  {/* Circle + Number */}
                  <div className="relative mb-5">
                    <div
                      className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                      style={{
                        background: step.bg,
                        border: `2px solid ${step.border}`,
                        boxShadow: `0 8px 24px ${step.bg}`,
                      }}
                    >
                      <Icon className="w-7 h-7" style={{ color: step.color }} />
                    </div>
                    {/* Step number badge */}
                    <div
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-[var(--background-navy)]"
                      style={{ background: step.color }}
                    >
                      {step.step}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{step.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-[140px]">
                    {step.description}
                  </p>

                  {/* Arrow between steps (desktop only, all except last) */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:flex absolute items-center justify-center" style={{}} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile step connectors */}
          <div className="lg:hidden flex flex-col items-center gap-1 mt-2">
            {steps.slice(0, -1).map((_, i) => (
              <div key={i} className="w-px h-6 bg-slate-300 dark:bg-white/10" />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/signup"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold"
          >
            Start Your First Interview Free
          </a>
        </div>
      </div>
    </section>
  );
}
