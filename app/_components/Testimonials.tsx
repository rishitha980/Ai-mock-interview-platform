"use client";
import React from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Software Engineer @ Google",
    avatar: "R",
    avatarBg: "linear-gradient(135deg, #6C47FF, #A855F7)",
    quote:
      "The AI feedback is amazing! It helped me crack my dream job. The questions were very relevant and the mock sessions felt just like real interviews.",
    stars: 5,
  },
  {
    name: "Priya Verma",
    role: "Product Manager @ Microsoft",
    avatar: "P",
    avatarBg: "linear-gradient(135deg, #10B981, #06B6D4)",
    quote:
      "The best platform to practice interviews and improve skills. I went from failing interviews to getting multiple offers in just 2 months.",
    stars: 5,
  },
  {
    name: "Ankit Patel",
    role: "SDE @ Amazon",
    avatar: "A",
    avatarBg: "linear-gradient(135deg, #F59E0B, #EF4444)",
    quote:
      "The questions are very relevant and the feedback is on point. The analytics helped me understand exactly where I needed to improve.",
    stars: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="reviews" className="py-20 lg:py-24 bg-background transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            Loved by <span className="gradient-text">Thousands of Users</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl mx-auto">
            Real stories from people who landed their dream jobs using AI Mock Interview
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="glass-card rounded-2xl p-6 hover:border-slate-350 dark:hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col gap-5"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-[#6C47FF]/40" />

              {/* User info */}
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base shadow-lg"
                  style={{ background: t.avatarBg }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500">{t.role}</p>
                </div>
              </div>

              {/* Quote text */}
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Stars */}
              <div className="flex items-center gap-1">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
