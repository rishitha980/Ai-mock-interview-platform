"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Brain,
  Briefcase,
  UserCheck,
  Sparkles,
  Code,
  CheckCircle,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const MAX_MB = 5;
const ACCEPTED = ".pdf,.doc,.docx";

export default function NewInterviewPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "customise">("upload");

  // Step 1 states
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Step 2 states
  const [formData, setFormData] = useState({
    role: "",
    experience: "Mid Level (2-4 yrs)",
    techStackRaw: "",
    difficulty: "Medium",
    interviewType: "Technical Interview",
  });
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");

  const steps = [
    "Analyzing Job Profile...",
    "Consulting Gemini Expert...",
    "Drafting 5 Targeted Technical Questions...",
    "Spinning Up Virtual Recruiter Environment...",
    "Ready! Launching Interview Session...",
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const pickFile = (f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File too large — max ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    setUploadError("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    if (!file && !jobDescription.trim()) { setUploadError("Please upload your resume and provide a job description to start the interview."); return; }
    if (!file) { setUploadError("Please upload a resume file."); return; }
    if (!jobDescription.trim()) { setUploadError("Please provide a job description."); return; }

    setUploadStatus("uploading");
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const resumeRes = await apiFetch("/upload-resume", { method: "POST", body: uploadData });
      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) throw new Error(resumeData.detail ?? "Resume upload failed.");

      setResumeId(resumeData.resume_id);
      if (resumeData.parsed_data) {
        const pd = resumeData.parsed_data;
        setFormData({
          role: pd.suggested_role || "",
          experience: pd.experience || "Mid Level (2-4 yrs)",
          techStackRaw: Array.isArray(pd.skills) ? pd.skills.join(", ") : "",
          difficulty: "Medium",
          interviewType: "Technical Interview",
        });
        setAnalysisData(pd);
      }

      const jdRes = await apiFetch("/job-description", {
        method: "POST",
        body: JSON.stringify({ job_description: jobDescription.trim() }),
      });
      const jdData = await jdRes.json();
      if (!jdRes.ok) throw new Error(jdData.detail ?? "Failed to save job description.");

      setUploadStatus("done");
      setTimeout(() => { setUploadStatus("idle"); setStep("customise"); }, 800);
    } catch (err: any) {
      setUploadStatus("error");
      setUploadError(err.message ?? "An unexpected error occurred.");
    }
  };

  const handleSkipStep1 = () => {
    setResumeId(null);
    setFile(null);
    setUploadError("");
    setStep("customise");
  };

  const isStep2Valid =
    formData.role.trim().length > 0 &&
    formData.techStackRaw.trim().length > 0 &&
    jobDescription.trim().length > 0;

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const userToken = localStorage.getItem("token");
    if (!userToken) { router.push("/login"); return; }
    if (!formData.role.trim()) {
      setError("Job Role is required to generate targeted questions.");
      return;
    }
    if (!formData.techStackRaw.trim()) {
      setError("Please specify at least one technology in your tech stack.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("A Job Description is required. Interview questions cannot be generated without it.");
      return;
    }
    setLoading(true);
    try {
      const tech_stack = formData.techStackRaw.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
      const payload = {
        role: formData.role.trim(),
        experience: formData.experience,
        tech_stack,
        job_description: jobDescription.trim(),
        difficulty_level: formData.difficulty,
      };
      const res = await apiFetch("/interviews", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to initialize interview");

      // If the user chose Voice Interview, store the questions in sessionStorage
      // and redirect to the voice interview page.
      if (formData.interviewType === "Voice Interview") {
        sessionStorage.setItem(
          "voice_interview_session",
          JSON.stringify({ id: data.id, questions: data.questions })
        );
        setTimeout(() => { router.push(`/interview/voice?id=${data.id}`); }, 1500);
      } else {
        setTimeout(() => { router.push(`/interview/${data.id}`); }, 1500);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Something went wrong. Please check your connection.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full mx-4">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute h-20 w-20 animate-ping rounded-full bg-indigo-400/20" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
              <Brain className="h-7 w-7 text-white animate-bounce" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-800">AI Interviewer Preparing</h2>
          <p className="mt-2 text-sm text-slate-500">Generating customized questions for your profile.</p>
          <div className="mt-6 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-indigo-600 animate-pulse">{steps[loadingStep]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Interview Setup</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {step === "upload" ? "Upload Resume & Job Description" : "Customize Interview Settings"}
            </h1>
          </div>
          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === "upload" ? "text-indigo-600" : "text-slate-400"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${step === "upload" ? "bg-indigo-600 text-white" : "bg-green-100 text-green-600"}`}>
                {step === "customise" ? "✓" : "1"}
              </span>
              Resume & JD
            </div>
            <div className="w-8 h-px bg-slate-200" />
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === "customise" ? "text-indigo-600" : "text-slate-400"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border ${step === "customise" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-400"}`}>2</span>
              Customize
            </div>
          </div>
        </div>

        {/* STEP 1 */}
        {step === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Resume Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-indigo-500" /> Upload Resume
              </h2>

              {uploadError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleStep1Submit} className="space-y-4">
                {/* Drag Drop */}
                {file ? (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3 truncate">
                      <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                      <span className="truncate text-sm text-slate-700 font-medium">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-slate-400 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                      dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                    }`}
                  >
                    <UploadCloud className={`mx-auto mb-3 h-10 w-10 ${dragOver ? "text-indigo-500" : "text-slate-300"}`} />
                    <p className="text-sm text-slate-600 font-medium">
                      Drag & Drop your resume here
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-3">or</p>
                    <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                      Browse File
                    </button>
                    <p className="text-[11px] text-slate-400 mt-3">Supports PDF, DOCX (Max {MAX_MB}MB)</p>
                  </div>
                )}

                <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileInput} />

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Job Description</label>
                  <textarea
                    rows={5}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description, responsibilities, and required skills..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 resize-y"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploadStatus === "uploading"}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60"
                  >
                    {uploadStatus === "uploading" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <> Save & Continue <ChevronRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Analysis Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" /> Analysis Summary
              </h2>

              {analysisData ? (
                <div className="space-y-5">
                  {/* Score Ring */}
                  <div className="flex flex-col items-center py-4">
                    <div className="relative h-32 w-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="50" fill="transparent"
                          stroke="#22c55e" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          strokeDashoffset={`${2 * Math.PI * 50 * 0.15}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-800">85</span>
                        <span className="text-[10px] text-slate-400 font-medium">/100</span>
                      </div>
                    </div>
                    <p className="mt-2 text-green-600 font-bold text-sm">Good Match</p>
                    <p className="text-xs text-slate-400">Your resume looks good!</p>
                  </div>

                  {/* Skills */}
                  {Array.isArray(analysisData.skills) && analysisData.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Skills Found</p>
                      <div className="flex flex-wrap gap-2">
                        {analysisData.skills.slice(0, 8).map((s: string) => (
                          <span key={s} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info cards */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    {[
                      { label: "Experience", value: analysisData.experience || "—" },
                      { label: "Education", value: analysisData.education || "—" },
                      { label: "Projects", value: `${analysisData.projects?.length || 0} Projects` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <div className="h-20 w-20 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">No resume uploaded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Upload your resume to see AI analysis</p>

                  {/* Placeholder summary */}
                  <div className="mt-6 w-full space-y-3">
                    {["Experience", "Education", "Skills Found"].map(l => (
                      <div key={l} className="bg-slate-50 rounded-lg h-8 animate-pulse" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === "customise" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">Generate Interview</h2>
                <button onClick={() => setStep("upload")} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
              </div>

              {/* Context bar */}
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 mb-5">
                <FileCheck2 className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-medium">
                  {resumeId ? `Resume linked: ${file?.name ?? "uploaded"}` : "Manual setup — no resume linked"}
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-indigo-500" /> Job Role
                  </label>
                  <input
                    type="text" name="role" required value={formData.role} onChange={handleChange}
                    placeholder="e.g. Backend Developer, Data Scientist"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-indigo-500" /> Experience Level
                    </label>
                    <select name="experience" value={formData.experience} onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 appearance-none cursor-pointer">
                      <option>Entry Level (0-1 yrs)</option>
                      <option>Junior (1-2 yrs)</option>
                      <option value="Mid Level (2-4 yrs)">2 - 4 Years</option>
                      <option>Senior (5-8 yrs)</option>
                      <option>Lead / Principal (8+ yrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-500" /> Difficulty Level
                    </label>
                    <select name="difficulty" value={formData.difficulty} onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 appearance-none cursor-pointer">
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-indigo-500" /> Interview Type
                  </label>
                  <select name="interviewType" value={formData.interviewType} onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 appearance-none cursor-pointer">
                    <option>Technical Interview</option>
                    <option>HR Interview</option>
                    <option>System Design</option>
                    <option>Behavioral Interview</option>
                    <option>Voice Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-indigo-500" /> Tech Stack (comma-separated)
                  </label>
                  <input
                    type="text" name="techStackRaw" required value={formData.techStackRaw} onChange={handleChange}
                    placeholder="e.g. React, Node.js, MongoDB, AWS"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here. This is required to generate relevant interview questions..."
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 resize-y transition-all ${
                      jobDescription.trim().length === 0
                        ? "border-amber-300 bg-amber-50/40 focus:border-amber-400 focus:ring-amber-400/20"
                        : "border-slate-200 bg-white focus:border-indigo-400 focus:ring-indigo-400/20"
                    }`}
                  />
                  {jobDescription.trim().length === 0 && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                      <AlertCircle className="h-3 w-3" />
                      Required — questions are tailored to the job description.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isStep2Valid}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isStep2Valid ? "Generate Questions" : "Fill all required fields to continue"}
                </button>
              </form>
            </div>

            {/* Preview Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-800 mb-4">Preview</h2>
              <div className="space-y-3">
                {[
                  { q: "What is FastAPI and how is it different from Flask?", diff: "Easy" },
                  { q: "Explain JWT authentication and its workflow.", diff: "Medium" },
                  { q: "How would you design a rate limiter in Python?", diff: "Hard" },
                  { q: "What is the difference between WSGI and ASGI?", diff: "Medium" },
                  { q: "How do you optimize a slow API endpoint?", diff: "Easy" },
                ].map(({ q, diff }, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 leading-relaxed">{q}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      diff === "Easy" ? "bg-green-100 text-green-700" :
                      diff === "Medium" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>{diff}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center py-1">+ more questions generated by AI based on your profile</p>
              </div>

              <div className="mt-4 flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-indigo-700">Use Resume for Better Questions</p>
                  <p className="text-[11px] text-indigo-500 mt-0.5">{resumeId ? "Resume linked ✓" : "Upload resume for personalized questions"}</p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors ${resumeId ? "bg-indigo-600" : "bg-slate-200"} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${resumeId ? "left-5" : "left-0.5"}`} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
