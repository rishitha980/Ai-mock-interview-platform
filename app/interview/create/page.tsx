"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import {
  Briefcase,
  Building2,
  Award,
  Layers,
  HelpCircle,
  Gauge,
  Languages,
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Code2,
  UploadCloud,
  X,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const MAX_MB = 5;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const stepsConfig = [
  { id: 1, label: "Resume" },
  { id: 2, label: "Job Description" },
  { id: 3, label: "Role" },
  { id: 4, label: "Experience" },
  { id: 5, label: "Difficulty" },
  { id: 6, label: "Type" },
];

export default function CreateInterviewPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    role: "",
    company_name: "",
    experience: "Senior (5-8 yrs)",
    interview_type: "Technical",
    num_questions: 10,
    difficulty_level: "Medium",
    preferred_language: "English",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: new Date(Date.now() + 30 * 60 * 1000).toTimeString().slice(0, 5),
    tech_stack: "",
    job_description: "",
    duration_minutes: 15,
  });

  // Resume states
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [parsedResume, setParsedResume] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stepMsg, setStepMsg] = useState("");

  const loadingPhrases = [
    "Analyzing job role and company profile...",
    "Configuring AI interviewer personality...",
    "Generating tailored interview questions...",
    "Scheduling interview session...",
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      let idx = 0;
      setStepMsg(loadingPhrases[0]);
      interval = setInterval(() => {
        idx = (idx + 1) % loadingPhrases.length;
        setStepMsg(loadingPhrases[idx]);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "num_questions" || name === "duration_minutes" ? Number(value) : value,
    }));
  };

  const handleSelectCard = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Resume file picker
  const pickFile = async (f: File) => {
    const extension = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setUploadError("Invalid file type. Please upload a PDF, DOC, or DOCX file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File too large — max ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    setUploadError("");
    setUploadStatus("uploading");

    try {
      const uploadData = new FormData();
      uploadData.append("file", f);
      const res = await apiFetch("/upload-resume", { method: "POST", body: uploadData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Resume upload failed.");

      setResumeId(data.resume_id);
      if (data.parsed_data) {
        setParsedResume(data.parsed_data);
      }
      setUploadStatus("done");
    } catch (err: any) {
      setUploadStatus("error");
      setUploadError(err.message ?? "An unexpected error occurred during upload.");
    }
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

  const removeFile = () => {
    setFile(null);
    setResumeId(null);
    setParsedResume(null);
    setUploadStatus("idle");
    setUploadError("");
  };

  const handleNext = () => {
    if (currentStep < 6) {
      // Step validations
      if (currentStep === 2 && !formData.job_description.trim()) {
        setError("Please enter a job description to proceed.");
        return;
      }
      if (currentStep === 3) {
        if (!formData.role.trim()) {
          setError("Job Role is required.");
          return;
        }
      }
      setError("");
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setError("");
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!formData.role.trim()) {
      setError("Job Role is required.");
      return;
    }

    if (!formData.scheduled_date || !formData.scheduled_time) {
      setError("Please specify both Interview Date and Interview Time.");
      return;
    }

    setLoading(true);

    try {
      const techStackList = formData.tech_stack
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        role: formData.role.trim(),
        company_name: formData.company_name.trim() || undefined,
        experience: formData.experience,
        interview_type: formData.interview_type,
        num_questions: Number(formData.num_questions) || 10,
        difficulty_level: formData.difficulty_level,
        preferred_language: formData.preferred_language,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        tech_stack: techStackList.length > 0 ? techStackList : [formData.role],
        job_description: formData.job_description.trim() || `Conducting a ${formData.interview_type} interview for ${formData.role}${formData.company_name.trim() ? ` at ${formData.company_name.trim()}` : ""}.`,
        duration_minutes: Number(formData.duration_minutes) || 15,
        resume_id: resumeId || undefined,
      };

      const res = await apiFetch("/interviews", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create interview session.");
      }

      setLoading(false);
      router.push(`/interview/voice?id=${data.id}`);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred while scheduling.");
    }
  };

  const renderResumeReference = () => {
    if (!parsedResume) return null;
    return (
      <div className="bg-[#1C2040]/30 border border-[#2A2E5A] rounded-xl p-5 space-y-4 h-fit">
        <div className="flex items-center gap-2 border-b border-[#2A2E5A] pb-3">
          <FileText className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Resume Reference
          </h3>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Here are details extracted from <strong>{file?.name || "your resume"}</strong>. Use them as a reference to fill in the manual inputs.
        </p>
        
        <div className="space-y-3.5 text-xs">
          {parsedResume.suggested_role && (
            <div>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-bold mb-0.5">Suggested Role</span>
              <span className="font-semibold text-slate-200 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/80 block select-all cursor-pointer truncate" title="Click to select all">
                {parsedResume.suggested_role}
              </span>
            </div>
          )}
          {parsedResume.skills && (
            <div>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-bold mb-0.5">Skills / Tech Stack</span>
              <span className="font-semibold text-slate-200 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/80 block select-all cursor-pointer max-h-24 overflow-y-auto" title="Click to select all">
                {Array.isArray(parsedResume.skills) ? parsedResume.skills.join(", ") : parsedResume.skills}
              </span>
            </div>
          )}
          {parsedResume.experience && (
            <div>
              <span className="text-[10px] text-slate-500 block uppercase tracking-wide font-bold mb-0.5">Experience Level</span>
              <span className="font-semibold text-slate-200 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/80 block truncate">
                {parsedResume.experience}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-10 overflow-y-auto bg-[#0C0E20] flex flex-col items-center justify-start">
        <div className="w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-2 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                <Sparkles className="h-6 w-6 text-indigo-400" />
                Create Interview
              </h1>
              <p className="text-slate-400 text-xs mt-1">Configure your custom AI-powered voice interview session.</p>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-12 text-center shadow-xl max-w-xl mx-auto my-12 space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-indigo-400 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-white">Creating Your Practice Session</h3>
              <p className="text-indigo-400 text-xs font-medium animate-pulse">{stepMsg}</p>
              <p className="text-[10px] text-slate-500">
                We are curating custom questions specifically for {formData.company_name} ({formData.role}).
              </p>
            </div>
          ) : (
            <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 md:p-8 shadow-xl space-y-8">
              {/* Progress Steps Timeline */}
              <div className="relative flex items-center justify-between">
                {/* Connecting Lines */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#1F223D] z-0">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
                  />
                </div>

                {stepsConfig.map((step, idx) => {
                  const isActive = step.id === currentStep;
                  const isCompleted = step.id < currentStep;
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-400 text-white shadow-lg shadow-indigo-500/35 scale-110"
                            : isCompleted
                            ? "bg-[#5c4ae4] border border-[#5c4ae4] text-white"
                            : "bg-[#13162C] border border-[#1F223D] text-slate-500"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : step.id}
                      </div>
                      <span
                        className={`text-[10px] mt-2 font-semibold tracking-wide ${
                          isActive ? "text-indigo-400" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Step Content */}
              <div className="pt-4 min-h-[300px]">
                {/* STEP 1: RESUME UPLOAD */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center md:text-left">
                      <h2 className="text-lg font-black text-white">Upload Your Resume (Optional)</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Upload your latest resume to help AI generate better questions for you (Optional).
                      </p>
                    </div>

                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        dragOver
                          ? "border-[#5c4ae4] bg-indigo-500/5"
                          : "border-[#1F223D] hover:border-indigo-500/50 hover:bg-[#1C2040]/10"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileRef}
                        onChange={handleFileInput}
                        accept={ACCEPTED_EXTENSIONS.join(",")}
                        className="hidden"
                      />
                      
                      {uploadStatus === "idle" && (
                        <div className="text-center space-y-4">
                          <UploadCloud className="h-10 w-10 text-slate-400 mx-auto" />
                          <div>
                            <p className="text-xs font-semibold text-white">Click to upload or drag and drop</p>
                            <p className="text-[10px] text-slate-500 mt-1">PDF, DOCX (Max. 5MB)</p>
                          </div>
                          <button
                            type="button"
                            className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 mx-auto"
                          >
                            <FileText className="h-3.5 w-3.5" /> Upload Resume
                          </button>
                        </div>
                      )}

                      {uploadStatus === "uploading" && (
                        <div className="text-center space-y-3">
                          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
                          <p className="text-xs text-indigo-400 font-semibold">Uploading and analyzing resume...</p>
                        </div>
                      )}

                      {uploadStatus === "done" && (
                        <div className="text-center space-y-3">
                          <FileCheck2 className="h-10 w-10 text-emerald-400 mx-auto" />
                          <div>
                            <p className="text-xs font-semibold text-white">{file?.name}</p>
                            <p className="text-[10px] text-emerald-400 mt-1">Resume parsed successfully!</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="text-slate-500 hover:text-red-400 text-xs font-semibold flex items-center gap-1 mx-auto"
                          >
                            <X className="h-4 w-4" /> Remove File
                          </button>
                        </div>
                      )}

                      {uploadStatus === "error" && (
                        <div className="text-center space-y-3">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                          <div>
                            <p className="text-xs font-semibold text-red-400">Upload failed</p>
                            <p className="text-[10px] text-slate-500 mt-1">{uploadError}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: JOB DESCRIPTION */}
                {currentStep === 2 && (
                  <div className={parsedResume ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-4"}>
                    <div className={parsedResume ? "md:col-span-2 space-y-4" : "space-y-4"}>
                      <div>
                        <h2 className="text-lg font-black text-white">Target Job Description</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Paste the target job description or responsibilities to tailor the interview.
                        </p>
                      </div>

                      <textarea
                        name="job_description"
                        rows={8}
                        value={formData.job_description}
                        onChange={handleChange}
                        placeholder="Paste job details here..."
                        className="w-full bg-[#13162C] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                      />
                    </div>
                    {renderResumeReference()}
                  </div>
                )}

                {/* STEP 3: ROLE & COMPANY */}
                {currentStep === 3 && (
                  <div className={parsedResume ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-5"}>
                    <div className={parsedResume ? "md:col-span-2 space-y-5" : "space-y-5"}>
                      <div>
                        <h2 className="text-lg font-black text-white">Job Role & Company</h2>
                        <p className="text-xs text-slate-400 mt-1">Provide target profile details for calibrating questions.</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Role (Required)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                              <Briefcase className="h-4 w-4" />
                            </span>
                            <input
                              type="text"
                              name="role"
                              required
                              value={formData.role}
                              onChange={handleChange}
                              placeholder="e.g. Frontend Engineer, Product Manager"
                              className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Company Name (Optional)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <input
                              type="text"
                              name="company_name"
                              value={formData.company_name}
                              onChange={handleChange}
                              placeholder="e.g. Google, Stripe"
                              className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl pl-9 pr-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Code2 className="h-3 w-3" /> Key Tech Stack (Comma-separated)
                          </label>
                          <input
                            type="text"
                            name="tech_stack"
                            value={formData.tech_stack}
                            onChange={handleChange}
                            placeholder="e.g. React, Python, Docker"
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                    {renderResumeReference()}
                  </div>
                )}

                {/* STEP 4: EXPERIENCE */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-black text-white">Experience Level</h2>
                      <p className="text-xs text-slate-400 mt-1">Select your experience level for this role.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { val: "Entry Level (0-1 yrs)", desc: "Graduates, interns, career starters" },
                        { val: "Junior (1-2 yrs)", desc: "Foundational professional experience" },
                        { val: "Mid Level (2-4 yrs)", desc: "Independent execution & tasks" },
                        { val: "Senior (5-8 yrs)", desc: "Architecture, leadership, complex design" },
                        { val: "Lead / Principal (8+ yrs)", desc: "High scale strategy, team roadmap" },
                      ].map((lvl) => {
                        const isSel = formData.experience === lvl.val;
                        return (
                          <div
                            key={lvl.val}
                            onClick={() => handleSelectCard("experience", lvl.val)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                              isSel
                                ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                                : "border-[#1F223D] bg-[#0C0E20]/50 hover:bg-[#0C0E20] hover:border-slate-700"
                            }`}
                          >
                            <span className="text-xs font-bold text-white">{lvl.val}</span>
                            <span className="text-[10px] text-slate-500 mt-1">{lvl.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 5: DIFFICULTY */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-black text-white">Rigor & Length</h2>
                      <p className="text-xs text-slate-400 mt-1">Calibrate the questions complexity, quantity, and language.</p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Difficulty Level</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { val: "Easy", desc: "Basics & Definitions" },
                            { val: "Medium", desc: "Design & Scenario Case" },
                            { val: "Hard", desc: "Architecture & Rigor" },
                          ].map((diff) => {
                            const isSel = formData.difficulty_level === diff.val;
                            return (
                              <div
                                key={diff.val}
                                onClick={() => handleSelectCard("difficulty_level", diff.val)}
                                className={`p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                                  isSel
                                    ? "border-indigo-500 bg-indigo-500/10"
                                    : "border-[#1F223D] bg-[#0C0E20]/50 hover:bg-[#0C0E20] hover:border-slate-700"
                                }`}
                              >
                                <span className="text-xs font-bold text-white block">{diff.val}</span>
                                <span className="text-[9px] text-slate-500 mt-1 block leading-tight">{diff.desc}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Number of Questions (Max 10)</label>
                          <select
                            name="num_questions"
                            value={formData.num_questions}
                            onChange={handleChange}
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          >
                            <option value={5}>5 Questions</option>
                            <option value={7}>7 Questions</option>
                            <option value={10}>10 Questions</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Interview Duration</label>
                          <select
                            name="duration_minutes"
                            value={formData.duration_minutes}
                            onChange={handleChange}
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          >
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={20}>20 minutes</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preferred Language</label>
                          <select
                            name="preferred_language"
                            value={formData.preferred_language}
                            onChange={handleChange}
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          >
                            <option value="English">English</option>
                            <option value="Spanish">Spanish (Español)</option>
                            <option value="French">French (Français)</option>
                            <option value="German">German (Deutsch)</option>
                            <option value="Hindi">Hindi (हिन्दी)</option>
                            <option value="Mandarin">Mandarin (中文)</option>
                            <option value="Japanese">Japanese (日本語)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: TYPE */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-black text-white">Interview Format & Schedule</h2>
                      <p className="text-xs text-slate-400 mt-1">Select focus areas and schedule when to start.</p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Interview Focus</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { val: "Technical", desc: "Skills & Logic" },
                            { val: "HR", desc: "Behavior & Culture" },
                            { val: "Mixed", desc: "Full calibration" },
                          ].map((t) => {
                            const isSel = formData.interview_type === t.val;
                            return (
                              <div
                                key={t.val}
                                onClick={() => handleSelectCard("interview_type", t.val)}
                                className={`p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                                  isSel
                                    ? "border-indigo-500 bg-indigo-500/10"
                                    : "border-[#1F223D] bg-[#0C0E20]/50 hover:bg-[#0C0E20] hover:border-slate-700"
                                }`}
                              >
                                <span className="text-xs font-bold text-white block">{t.val}</span>
                                <span className="text-[9px] text-slate-500 mt-1 block leading-tight">{t.desc}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-indigo-400" /> Interview Date (Required)
                          </label>
                          <input
                            type="date"
                            name="scheduled_date"
                            required
                            value={formData.scheduled_date}
                            onChange={handleChange}
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-indigo-400" /> Interview Time (Required)
                          </label>
                          <input
                            type="time"
                            name="scheduled_time"
                            required
                            value={formData.scheduled_time}
                            onChange={handleChange}
                            className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between border-t border-[#1E223D] pt-5">
                <button
                  type="button"
                  disabled={currentStep === 1}
                  onClick={handleBack}
                  className={`inline-flex items-center gap-1 px-5 py-2.5 rounded-xl border border-[#1F223D] text-xs font-semibold transition-all ${
                    currentStep === 1
                      ? "text-slate-600 border-slate-900/50 cursor-not-allowed"
                      : "text-slate-300 hover:bg-[#0C0E20] hover:text-white"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="text-xs text-slate-400 hover:text-white font-semibold transition-all px-4 py-2"
                  >
                    Cancel
                  </Link>

                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="bg-indigo-600 hover:bg-[#5c4ae4] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-xs font-black px-7 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                    >
                      <Sparkles className="h-4 w-4" /> Create & Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
