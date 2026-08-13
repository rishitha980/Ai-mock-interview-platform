"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  Briefcase,
  Code2,
  User,
  FolderOpen,
  GraduationCap,
  BadgeCheck,
  Lightbulb,
  Tag,
  BarChart3,
  Bell,
  Moon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SectionItem {
  status: "good" | "average" | "missing";
  notes: string;
}

interface SectionAnalysis {
  contact?: SectionItem;
  summary?: SectionItem;
  skills?: SectionItem;
  experience?: SectionItem;
  projects?: SectionItem;
  education?: SectionItem;
  certifications?: SectionItem;
}

interface ParsedData {
  name?: string;
  email?: string;
  skills?: string[];
  experience?: string;
  suggested_role?: string;
  experience_analysis?: string;
  ats_score?: number;
  resume_version?: string;
  skills_found_count?: number;
  missing_skills_count?: number;
  projects_count?: number;
  education?: string;
  certifications_count?: number;
  ai_suggestions?: string[];
  strengths?: string[];
  weaknesses?: string[];
  improvement_areas?: string[];
  ats_score_reason?: string;
  missing_keywords?: string[];
  section_analysis?: SectionAnalysis;
  resume_quality_rating?: string;
  how_to_improve?: string[];
}

interface ResumeRecord {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  parsed_data: ParsedData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sectionMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  contact: { label: "Contact Information", icon: <User className="h-4 w-4" /> },
  summary: { label: "Professional Summary", icon: <FileText className="h-4 w-4" /> },
  skills: { label: "Technical Skills", icon: <Code2 className="h-4 w-4" /> },
  experience: { label: "Work Experience", icon: <Briefcase className="h-4 w-4" /> },
  projects: { label: "Projects", icon: <FolderOpen className="h-4 w-4" /> },
  education: { label: "Education", icon: <GraduationCap className="h-4 w-4" /> },
  certifications: { label: "Certifications", icon: <BadgeCheck className="h-4 w-4" /> },
};

function StatusBadge({ status }: { status: "good" | "average" | "missing" }) {
  const map = {
    good: { label: "Good", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    average: { label: "Average", color: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    missing: { label: "Missing", color: "bg-red-500/10 border-red-500/20 text-red-400" },
  };
  const { label, color } = map[status] ?? map.missing;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider ${color}`}>
      {status === "good" && <CheckCircle2 className="h-3 w-3" />}
      {status === "average" && <AlertCircle className="h-3 w-3" />}
      {status === "missing" && <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function QualityBadge({ rating }: { rating?: string }) {
  const map: Record<string, string> = {
    Excellent: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    Good: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    Average: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    "Needs Work": "bg-red-500/10 border-red-500/20 text-red-400",
  };
  const cls = map[rating ?? ""] ?? "bg-slate-500/10 border-slate-500/20 text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold uppercase tracking-wider ${cls}`}>
      <Award className="h-3.5 w-3.5" />
      {rating ?? "—"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    Promise.all([fetchResume(), fetchProfile()]);
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.name) setUserInitial(data.name.charAt(0).toUpperCase());
      }
    } catch {}
  };

  const fetchResume = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/resumes");
      if (res.ok) {
        const data: ResumeRecord[] = await res.json();
        setResume(data.length > 0 ? data[0] : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const p: ParsedData = resume?.parsed_data ?? {};
  const atsScore = p.ats_score ?? 0;
  const circ = 2 * Math.PI * 45;
  const strokeDashoffset = circ - (atsScore / 100) * circ;
  const scoreColor = atsScore >= 80 ? "#10B981" : atsScore >= 50 ? "#F59E0B" : "#EF4444";

  const sectionOrder = ["contact", "summary", "skills", "experience", "projects", "education", "certifications"];

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[#1E223D] pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/resume")}
              className="p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Detailed Resume Analysis</h1>
              {resume && (
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> {resume.filename}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-300 hover:text-white transition-colors">
              <Moon className="h-4 w-4" />
            </button>
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

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          </div>
        ) : !resume ? (
          /* ── No Resume ── */
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <FileText className="h-12 w-12 text-slate-600" />
            <p className="text-slate-400 font-bold text-sm">No resume uploaded yet.</p>
            <button
              onClick={() => router.push("/dashboard/resume")}
              className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Go Back & Upload
            </button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Section 1: Score Hero Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ATS Score Gauge */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center gap-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider w-full text-left">ATS Score</h3>

                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="#1F223D" strokeWidth="7" />
                    <circle
                      cx="50" cy="50" r="45"
                      fill="transparent"
                      stroke={scoreColor}
                      strokeWidth="7"
                      strokeDasharray={`${circ}`}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-black text-white">{atsScore}</span>
                    <span className="text-[10px] text-slate-400 block">/100</span>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <QualityBadge rating={p.resume_quality_rating} />
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    {p.ats_score_reason ?? "ATS compatibility score based on keyword density and content analysis."}
                  </p>
                </div>
              </div>

              {/* Key Stats Grid */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Skills Found", value: p.skills_found_count ?? 0, color: "text-indigo-400" },
                  { label: "Missing Skills", value: p.missing_skills_count ?? 0, color: "text-amber-400" },
                  { label: "Projects", value: p.projects_count ?? 0, color: "text-blue-400" },
                  { label: "Certifications", value: p.certifications_count ?? 0, color: "text-emerald-400" },
                  { label: "Missing Keywords", value: (p.missing_keywords ?? []).length, color: "text-red-400" },
                  { label: "Resume Version", value: p.resume_version ?? "v1.0", color: "text-purple-400", isText: true },
                ].map((item) => (
                  <div key={item.label} className="bg-[#13162C] border border-[#1F223D] rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                    <span className={`${item.isText ? "text-lg" : "text-2xl"} font-black mt-2 ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 2: Strengths + Weaknesses Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Strengths */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Resume Strengths
                </h3>
                {(p.strengths ?? []).length > 0 ? (
                  <ul className="space-y-2.5">
                    {(p.strengths ?? []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                        <span className="text-emerald-400 font-black shrink-0 mt-0.5">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">Upload and analyze your resume to see strengths.</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" /> Resume Weaknesses
                </h3>
                {(p.weaknesses ?? []).length > 0 ? (
                  <ul className="space-y-2.5">
                    {(p.weaknesses ?? []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                        <span className="text-red-400 font-black shrink-0 mt-0.5">✗</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No major weaknesses detected.</p>
                )}
              </div>
            </div>

            {/* ── Section 3: Skills + Missing Keywords Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Detected Skills */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-indigo-400" /> Detected Skills
                </h3>
                {(p.skills ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(p.skills ?? []).map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No skills detected in resume.</p>
                )}
              </div>

              {/* Missing Keywords */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="h-4 w-4 text-amber-400" /> Missing ATS Keywords
                </h3>
                {(p.missing_keywords ?? []).length > 0 ? (
                  <>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      These important ATS keywords were not found in your resume. Adding them can significantly improve your score.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(p.missing_keywords ?? []).map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold"
                        >
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">All common ATS keywords found — great work!</p>
                )}
              </div>
            </div>

            {/* ── Section 4: Section-by-Section Analysis ── */}
            <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" /> Section-by-Section Analysis
              </h3>

              {Object.keys(p.section_analysis ?? {}).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionOrder.map((key) => {
                    const sec = (p.section_analysis ?? {})[key as keyof SectionAnalysis];
                    if (!sec) return null;
                    const meta = sectionMeta[key];
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-3 bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4"
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          sec.status === "good"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : sec.status === "average"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-red-500/10 text-red-400"
                        }`}>
                          {meta?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-white">{meta?.label}</span>
                            <StatusBadge status={sec.status} />
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{sec.notes}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center border border-dashed border-[#1F223D] rounded-xl">
                  <BarChart3 className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Section analysis not available for this resume.</p>
                </div>
              )}
            </div>

            {/* ── Section 5: Improvement Areas + How To Improve ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Improvement Areas */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" /> Improvement Areas
                </h3>
                {(p.improvement_areas ?? []).length > 0 ? (
                  <ul className="space-y-2.5">
                    {(p.improvement_areas ?? []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific improvement areas identified.</p>
                )}
              </div>

              {/* Experience Analysis */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-400" /> Experience Analysis
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Level</span>
                    <span className="text-xs font-bold text-white">{p.experience ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Target Role</span>
                    <span className="text-xs font-bold text-indigo-300">{p.suggested_role ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Education</span>
                    <span className="text-xs font-bold text-white">{p.education ?? "—"}</span>
                  </div>
                  {p.experience_analysis && (
                    <div className="pt-2 border-t border-[#1F223D]">
                      <p className="text-[11px] text-slate-400 leading-relaxed">{p.experience_analysis}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section 6: How To Improve ── */}
            <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400" /> How to Improve Your Resume
              </h3>

              {(p.how_to_improve ?? []).length > 0 ? (
                <ol className="space-y-3">
                  {(p.how_to_improve ?? []).map((step, i) => (
                    <li key={i} className="flex items-start gap-4 bg-[#0C0E20]/40 border border-[#1F223D] rounded-xl p-4">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#5c4ae4]/20 border border-[#5c4ae4]/30 text-indigo-400 flex items-center justify-center text-xs font-black">
                        {i + 1}
                      </span>
                      <span className="text-xs text-slate-300 leading-relaxed mt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500 italic">No improvement steps available. Upload a resume for personalized recommendations.</p>
              )}
            </div>

            {/* ── Section 7: AI Suggestions ── */}
            <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-5">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" /> AI Suggestions
              </h3>

              {(p.ai_suggestions ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(p.ai_suggestions ?? []).map((sug, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#5c4ae4]/5 border border-[#5c4ae4]/20 rounded-xl p-4">
                      <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">{sug}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No AI suggestions available yet.</p>
              )}
            </div>

            {/* ── Footer CTA ── */}
            <div className="flex items-center justify-between border-t border-[#1E223D] pt-6">
              <button
                onClick={() => router.push("/dashboard/resume")}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Resume
              </button>
              <button
                onClick={() => router.push("/interview/create")}
                className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center gap-2"
              >
                <Target className="h-3.5 w-3.5" /> Start Mock Interview
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
