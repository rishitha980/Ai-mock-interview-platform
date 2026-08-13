"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Award, 
  Lightbulb, 
  Cpu,
  Target,
  ArrowUpRight
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function JDMatchingPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const res = await apiFetch("/resumes");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load resumes.");
      }
      const data = await res.json();
      setResumes(data);
      if (data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMatchResult(null);

    if (!selectedResumeId) {
      setErrorMsg("Please upload and select a resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setErrorMsg("Please provide a target job description.");
      return;
    }

    setMatching(true);
    try {
      const res = await apiFetch("/matching/score", {
        method: "POST",
        body: JSON.stringify({
          resume_id: selectedResumeId,
          job_description: jobDescription.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "ATS matching evaluation failed.");
      }
      setMatchResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setMatching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "stroke-green-500 text-green-600";
    if (score >= 50) return "stroke-amber-500 text-amber-600";
    return "stroke-red-500 text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-100";
    if (score >= 50) return "bg-amber-50 border-amber-100";
    return "bg-red-50 border-red-100";
  };

  if (loadingResumes) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm font-medium text-slate-500">Loading your profile archives...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Resume Analytics</p>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            ATS Job Match Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Compare your resume against target job descriptions using Gemini AI keyword matching.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Inputs Section */}
          <form onSubmit={handleMatchSubmit} className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">ATS Parameters</h3>

            {resumes.length === 0 ? (
              <div className="text-center p-6 border border-slate-200 rounded-xl bg-slate-50">
                <FileText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">No resumes found. Upload one in a new interview session first.</p>
                <Link href="/interview/new">
                  <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-xs text-white">
                    Upload Resume
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Select Active Resume
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} ({new Date(r.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Paste Target Job Description
              </label>
              <textarea
                rows={10}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste responsibilities, technology stacks, skills requirements, or full job listing details..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white resize-y leading-relaxed"
              />
            </div>

            <Button
              type="submit"
              disabled={matching || resumes.length === 0}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 py-3 font-semibold text-white shadow-sm active:scale-[0.99]"
            >
              {matching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Calculating ATS Scores...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-1.5" />
                  Run Compatibility Check
                </>
              )}
            </Button>
          </form>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6">
            {matching && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                <Cpu className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                <h4 className="text-sm font-bold text-slate-700">Comparing Keywords</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">Gemini is checking missing skills, ATS alignment, and optimizing matching recommendations.</p>
              </div>
            )}

            {!matchResult && !matching && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[350px] shadow-sm">
                <FileText className="h-12 w-12 text-slate-200 mb-4" />
                <h4 className="text-sm font-semibold text-slate-500">Match Report Empty</h4>
                <p className="text-xs text-slate-400 mt-1">Submit the parameters on the left to review your ATS score card.</p>
              </div>
            )}

            {matchResult && !matching && (
              <div className="space-y-4">
                {/* Score card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                  {/* Radial progress ring */}
                  <div className="relative shrink-0 flex items-center justify-center h-28 w-28">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="46" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
                      <circle 
                        cx="56" 
                        cy="56" 
                        r="46" 
                        fill="transparent" 
                        strokeWidth="6" 
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 * (1 - matchResult.match_score / 100)}
                        className={`transition-all duration-1000 ${getScoreColor(matchResult.match_score).split(" ")[0]}`}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className={`text-3xl font-extrabold ${getScoreColor(matchResult.match_score).split(" ")[1]}`}>
                        {matchResult.match_score}%
                      </span>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ATS Match</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Compatibility Summary
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {matchResult.gaps_analysis}
                    </p>
                  </div>
                </div>

                {/* Grid columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Matched Technologies
                    </h4>
                    {matchResult.matched_skills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No skills overlap discovered.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {matchResult.matched_skills.map((skill: string) => (
                          <li key={skill} className="text-xs text-slate-600 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            {skill}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Missing Keywords / Gaps
                    </h4>
                    {matchResult.missing_skills.length === 0 ? (
                      <p className="text-xs text-green-600 italic">Perfect ATS keyword coverage!</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {matchResult.missing_skills.map((skill: string) => (
                          <li key={skill} className="text-xs text-slate-600 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            {skill}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-3 flex items-center gap-1.5">
                    <Award className="h-4 w-4" /> Resume Strengths
                  </h4>
                  <ul className="space-y-2">
                    {matchResult.strengths.map((str: string, i: number) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {str}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-4 border-l-indigo-500">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4" /> Optimization Recommendations
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {matchResult.recommendations}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
