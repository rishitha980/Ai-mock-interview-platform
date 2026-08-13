"use client";
import React from "react";

const companies = [
  {
    name: "Google",
    logo: (
      <svg viewBox="0 0 74 24" className="h-6 w-auto fill-current" aria-label="Google">
        <path d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z" />
        <path d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52s1.52-3.52 3.28-3.52 3.28 1.45 3.28 3.52-1.52 3.52-3.28 3.52z" />
        <path d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12s2.53 5.81 5.43 5.81c1.39 0 2.49-.61 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 7.03c-1.76 0-3.1-1.49-3.1-3.52s1.34-3.52 3.1-3.52c1.74 0 3.1 1.52 3.1 3.54s-1.36 3.5-3.1 3.5z" />
        <path d="M38 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52s1.52-3.52 3.28-3.52 3.28 1.45 3.28 3.52-1.52 3.52-3.28 3.52z" />
        <path d="M58 .24h2.51v17.57H58z" />
        <path d="M68.26 15.52c-1.3 0-2.22-.59-2.82-1.76l7.77-3.21-.26-.66c-.48-1.3-1.96-3.7-4.97-3.7-2.99 0-5.48 2.35-5.48 5.81 0 3.26 2.46 5.81 5.76 5.81 2.66 0 4.2-1.63 4.84-2.57l-1.98-1.32c-.66.96-1.56 1.6-2.86 1.6zm-.18-7.15c1.03 0 1.91.53 2.2 1.28l-5.25 2.17c0-2.44 1.73-3.45 3.05-3.45z" />
      </svg>
    ),
  },
  {
    name: "Microsoft",
    logo: (
      <svg viewBox="0 0 23 23" className="h-7 w-auto" aria-label="Microsoft">
        <rect x="0" y="0" width="11" height="11" fill="#F25022" />
        <rect x="12" y="0" width="11" height="11" fill="#7FBA00" />
        <rect x="0" y="12" width="11" height="11" fill="#00A4EF" />
        <rect x="12" y="12" width="11" height="11" fill="#FFB900" />
      </svg>
    ),
  },
  {
    name: "Amazon",
    logo: (
      <svg viewBox="0 0 603 182" className="h-7 w-auto fill-current" aria-label="Amazon">
        <path d="M341.3 142.6c-31.7 23.4-77.8 35.8-117.4 35.8-55.5 0-105.5-20.5-143.4-54.7-3-2.7-.3-6.3 3.3-4.2 40.9 23.8 91.4 38.1 143.6 38.1 35.2 0 73.9-7.3 109.5-22.4 5.3-2.4 9.8 3.5 4.4 7.4zm12.5-14.2c-4-5.2-26.8-2.5-37.1-1.2-3.1.4-3.6-2.3-.8-4.3 18.2-12.8 47.9-9.1 51.4-4.8 3.5 4.3-1 34.1-18 48.4-2.6 2.2-5.1 1-3.9-1.8 3.8-9.6 12.4-31.1 8.4-36.3z" />
        <path d="M293.3 26.2c-8.1 0-16.3 2.1-23.5 6.4-2.1 1.2-4 .1-4.6-2.2l-2.3-9.7c-.9-3.8-4.4-6.5-8.4-6.5h-28.2c-4.7 0-7.6 4.9-5.4 9.1l4.4 8.7c1.5 2.9 1.4 6.3-.1 9.2l-42 78.9c-1 2-.8 4.4.6 6.2 1.4 1.8 3.6 2.8 5.9 2.5l29.1-3.5c3.7-.4 6.9-3 7.9-6.5l7.4-26.3c2.7-9.6 11.4-16.2 21.4-16.2h.7c9.8 0 18.5 6.5 21.4 15.8l10.3 32.6c1.3 4.1 5.1 6.9 9.4 6.9h28.4c4.6 0 7.7-4.6 5.9-8.8l-34.4-80.7c-3.8-9-12.6-15.9-22.9-16.3-.8 0-1.7-.1-2.5-.1zM201.7 101.1c.9-3.5 4.1-5.9 7.7-5.9h14.8c3.9 0 6.9 3.5 6.3 7.4l-4.5 27.6c-.7 4.1-4.7 6.7-8.8 5.8l-12.3-2.8c-3.9-.9-6.3-4.8-5.4-8.7l2.2-23.4z" opacity=".85"/>
        <text x="0" y="160" fontSize="150" fontFamily="Arial" fontWeight="bold" fill="currentColor" opacity="0">Amazon</text>
      </svg>
    ),
  },
  { name: "TCS", logo: null },
  { name: "Infosys", logo: null },
  { name: "Deloitte", logo: null },
];

export default function SocialProof() {
  return (
    <section className="py-10 border-y border-white/5 bg-[#0D1120]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-slate-500 font-medium mb-8">
          Trusted by <span className="text-white font-semibold">10,000+</span> students and professionals
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {companies.map((company) => (
            <div
              key={company.name}
              className="text-slate-400 hover:text-white transition-colors duration-300 opacity-60 hover:opacity-100"
            >
              {company.logo ?? (
                <span className="text-lg font-black tracking-tight">{company.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
