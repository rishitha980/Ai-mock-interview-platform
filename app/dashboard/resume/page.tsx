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
  Trash2,
  Download,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Calendar,
  Building2,
  CheckCircle2,
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Moon,
  Sun,
  Bell
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const MAX_MB = 5;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

export default function ResumeDashboardPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [pageLoading, setPageLoading] = useState(true);
  const [resume, setResume] = useState<any>(null);
  
  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // User details
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchProfile();
    fetchResume();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          setUserInitial(data.name.charAt(0).toUpperCase());
        }
      }
    } catch {}
  };

  const fetchResume = async () => {
    setPageLoading(true);
    try {
      const res = await apiFetch("/resumes");
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Get the most recent resume
          setResume(data[0]);
        } else {
          setResume(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  };

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

      setUploadStatus("done");
      setTimeout(() => {
        setUploadStatus("idle");
        setFile(null);
        fetchResume();
      }, 1000);
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

  const handleDownload = async (resumeId: string, filename: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/resumes/${resumeId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download file.");
    }
  };

  const handleDelete = async () => {
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resume) return;
    setDeletingResume(true);
    setDeleteError("");
    try {
      const res = await apiFetch(`/resumes/${resume.id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDeleteModal(false);
        setResume(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.detail ?? "Failed to delete resume. Please try again.");
      }
    } catch {
      setDeleteError("An error occurred while deleting. Please try again.");
    } finally {
      setDeletingResume(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Extract parsed data attributes safely
  const parsed = resume?.parsed_data || {};
  const atsScore = parsed.ats_score || 0;
  const resumeVersion = parsed.resume_version || "—";
  const skillsFound = parsed.skills_found_count || 0;
  const missingSkills = parsed.missing_skills_count || 0;
  const projectsCount = parsed.projects_count || 0;
  const experienceText = parsed.experience || "—";
  const educationText = parsed.education || "—";
  const certificationsCount = parsed.certifications_count || 0;
  const suggestions = parsed.ai_suggestions || [];

  // Circle calculation for ATS Score gauge
  const circ = 2 * Math.PI * 45;
  const strokeDashoffset = circ - (atsScore / 100) * circ;

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E223D] pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">My Resume</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Icon */}
            <button className="p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-300 hover:text-white transition-colors">
              <Moon className="h-4 w-4" />
            </button>

            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl bg-[#13162C] border border-[#1F223D] text-slate-300 hover:text-white transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#5c4ae4]" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-3">
              <Link
                href="/account"
                className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-indigo-500/30 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer"
              >
                {userInitial}
              </Link>
            </div>
          </div>
        </div>

        {pageLoading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Resume Status */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Resume Status</span>
                {uploadStatus === "uploading" ? (
                  <p className="text-sm font-bold text-indigo-400 mt-2 flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                  </p>
                ) : resume ? (
                  <p className="text-sm font-bold text-[#10B981] mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Uploaded
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber-500 mt-2 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Not Uploaded
                  </p>
                )}
              </div>

              {/* Card 2: ATS Score */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ATS Score</span>
                <p className="text-2xl font-black text-white mt-2">
                  {uploadStatus === "uploading" ? (
                    <span className="text-sm text-indigo-400 font-semibold animate-pulse">Computing...</span>
                  ) : resume ? (
                    <>
                      {atsScore}
                      <span className="text-xs text-slate-400 font-medium ml-1">/100</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>

              {/* Card 3: Resume Version */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Resume Version</span>
                <p className="text-2xl font-black text-white mt-2 font-mono">
                  {uploadStatus === "uploading" ? (
                    <span className="text-sm text-indigo-400 font-semibold animate-pulse">Checking...</span>
                  ) : resume ? (
                    resumeVersion
                  ) : (
                    "—"
                  )}
                </p>
              </div>

              {/* Card 4: Last Updated */}
              <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Last Updated</span>
                <p className="text-base font-black text-white mt-3 truncate">
                  {uploadStatus === "uploading" ? (
                    <span className="text-xs text-indigo-400 font-semibold animate-pulse">Saving...</span>
                  ) : resume ? (
                    formatDate(resume.created_at)
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            {/* Main Row layout (2/3 and 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Resume Upload Card */}
                <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-indigo-400" /> Resume Upload
                  </h3>

                  {uploadError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadStatus === "uploading" ? (
                    <div className="border border-dashed border-indigo-500/50 rounded-2xl p-10 flex flex-col items-center justify-center bg-[#5c4ae4]/5">
                      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                      <p className="text-xs text-indigo-400 font-bold">Uploading and analyzing resume...</p>
                      <p className="text-[10px] text-slate-400 mt-1">AI is parsing keywords and calculating your score.</p>
                    </div>
                  ) : resume ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 bg-[#0C0E20]/50 border border-[#1F223D] p-4 rounded-xl relative group">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{resume.filename}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase">
                            {resume.content_type?.split("/")[1]?.toUpperCase() || "PDF"} • {formatFileSize(resume.size_bytes)}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Uploaded on {formatDate(resume.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Control buttons */}
                      <div className="flex items-center justify-between border-t border-[#1E223D] pt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="bg-[#5c4ae4] hover:bg-[#4a3bc7] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                          >
                            Replace Resume
                          </button>
                          <button
                            onClick={() => handleDownload(resume.id, resume.filename)}
                            className="bg-[#0C0E20] hover:bg-[#0C0E20]/80 border border-[#1F223D] text-slate-300 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                        </div>

                        <button
                          onClick={() => handleDelete()}
                          className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Delete Resume"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                        dragOver
                          ? "border-[#5c4ae4] bg-[#5c4ae4]/5"
                          : "border-[#1F223D] hover:border-indigo-500/50 hover:bg-[#1C2040]/10"
                      }`}
                    >
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
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileRef}
                    onChange={handleFileInput}
                    accept={ACCEPTED_EXTENSIONS.join(",")}
                    className="hidden"
                  />
                </div>

                {/* Resume Analysis */}
                <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Resume Analysis</h3>
                  
                  {uploadStatus === "uploading" ? (
                    <div className="py-16 text-center text-slate-500 border border-[#1F223D] rounded-xl flex flex-col items-center justify-center bg-[#0C0E20]/20">
                      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                      <p className="text-xs font-bold text-indigo-400">AI is compiling resume metrics...</p>
                    </div>
                  ) : resume ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Skills Found */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Skills Found</span>
                        <span className="text-2xl font-black text-white block mt-1.5">{skillsFound}</span>
                      </div>
                      
                      {/* Missing Skills */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Missing Skills</span>
                        <span className="text-2xl font-black text-white block mt-1.5">{missingSkills}</span>
                      </div>

                      {/* Projects */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Projects</span>
                        <span className="text-2xl font-black text-white block mt-1.5">{projectsCount}</span>
                      </div>

                      {/* Experience */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4 col-span-1">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Experience</span>
                        <span className="text-sm font-bold text-white block mt-2.5 truncate" title={experienceText}>{experienceText}</span>
                      </div>

                      {/* Education */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4 col-span-1">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Education</span>
                        <span className="text-sm font-bold text-white block mt-2.5 truncate" title={educationText}>{educationText}</span>
                      </div>

                      {/* Certifications */}
                      <div className="bg-[#0C0E20]/50 border border-[#1F223D] rounded-xl p-4">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Certifications</span>
                        <span className="text-2xl font-black text-white block mt-1.5">{certificationsCount}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 border border-dashed border-[#1F223D] rounded-xl flex flex-col items-center justify-center bg-[#0C0E20]/10">
                      <FileText className="h-8 w-8 text-slate-600 mb-2" />
                      <p className="text-xs font-bold text-slate-400">No resume uploaded yet. Upload your resume to get ATS analysis.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (1/3 width) */}
              <div className="space-y-6">
                {/* ATS Score Radial Circle Card */}
                <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-between min-h-[220px]">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider w-full text-left">ATS Score</h3>

                  {uploadStatus === "uploading" ? (
                    <div className="w-32 h-32 flex items-center justify-center my-4">
                      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="relative w-32 h-32 flex items-center justify-center my-4">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {/* Track circle */}
                        <circle cx="50" cy="50" r="45" fill="transparent" stroke="#1F223D" strokeWidth="6" />
                        {/* Progress circle */}
                        {resume && (
                          <circle
                            cx="50" cy="50" r="45"
                            fill="transparent"
                            stroke={atsScore >= 80 ? "#10B981" : atsScore >= 50 ? "#F59E0B" : "#EF4444"}
                            strokeWidth="6"
                            strokeDasharray={`${circ}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      
                      {/* Score inside circular gauge */}
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-white">{resume ? atsScore : "—"}</span>
                        {resume && <span className="text-[10px] text-slate-400 block leading-none">/100</span>}
                      </div>
                    </div>
                  )}

                  <span className={`text-xs font-extrabold ${
                    resume ? (atsScore >= 80 ? "text-[#10B981]" : atsScore >= 50 ? "text-[#F59E0B]" : "text-[#EF4444]") : "text-slate-500"
                  } text-center max-w-[200px] leading-relaxed`}>
                    {uploadStatus === "uploading"
                      ? "AI is evaluating..."
                      : resume
                      ? (atsScore >= 80 ? "Great Score!" : atsScore >= 50 ? "Average Match" : "Needs Review")
                      : "No resume uploaded yet. Upload your resume to get ATS analysis."}
                  </span>
                </div>

                {/* AI Suggestions Card */}
                <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg space-y-5 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Suggestions</h3>

                  {uploadStatus === "uploading" ? (
                    <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center bg-[#0C0E20]/10 rounded-xl">
                      <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
                      <p className="text-xs font-bold text-indigo-400">Gemini is compiling recommendations...</p>
                    </div>
                  ) : resume ? (
                    <div className="space-y-4 text-xs text-slate-300 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                      {parsed.ats_score_reason && (
                        <div className="p-3 bg-[#0C0E20]/50 rounded-xl border border-[#1F223D]">
                          <p className="font-extrabold text-slate-400 mb-1 text-[10px] uppercase tracking-wider">ATS Score Reason</p>
                          <p className="leading-relaxed font-semibold text-slate-200">{parsed.ats_score_reason}</p>
                        </div>
                      )}

                      {parsed.strengths && parsed.strengths.length > 0 && (
                        <div>
                          <p className="font-extrabold text-[#10B981] mb-1.5 uppercase tracking-wide text-[10px]">Resume Strengths</p>
                          <ul className="space-y-1 pl-1">
                            {parsed.strengths.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed font-medium">
                                <span className="text-[#10B981] shrink-0 font-bold">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsed.weaknesses && parsed.weaknesses.length > 0 && (
                        <div>
                          <p className="font-extrabold text-red-400 mb-1.5 uppercase tracking-wide text-[10px]">Weaknesses</p>
                          <ul className="space-y-1 pl-1">
                            {parsed.weaknesses.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed font-medium">
                                <span className="text-red-400 shrink-0 font-bold">✗</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {parsed.improvement_areas && parsed.improvement_areas.length > 0 && (
                        <div>
                          <p className="font-extrabold text-indigo-400 mb-1.5 uppercase tracking-wide text-[10px]">Improvement Areas</p>
                          <ul className="space-y-1 pl-1">
                            {parsed.improvement_areas.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed font-medium">
                                <span className="text-indigo-400 shrink-0">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {suggestions && suggestions.length > 0 && (
                        <div>
                          <p className="font-extrabold text-slate-400 mb-1.5 uppercase tracking-wide text-[10px]">AI Suggestions</p>
                          <ul className="space-y-1.5 pl-1">
                            {suggestions.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 leading-relaxed font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-[#1F223D] rounded-xl flex flex-col items-center justify-center bg-[#0C0E20]/10">
                      <Sparkles className="h-8 w-8 text-slate-600 mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-slate-400">No resume uploaded yet. Upload your resume to get ATS analysis.</p>
                    </div>
                  )}

                  <button
                    onClick={() => router.push("/dashboard/resume/analysis")}
                    disabled={!resume}
                    className="w-full bg-[#5c4ae4] hover:bg-[#4a3bc7] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 mt-4"
                  >
                    View Detailed Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>

            {/* Title */}
            <h2 className="text-lg font-black text-white text-center">Delete Resume?</h2>
            <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
              Are you sure you want to delete this resume?<br />
              This will permanently remove the file and all ATS analysis data.<br />
              <span className="text-red-400 font-semibold">This action cannot be undone.</span>
            </p>

            {/* Error */}
            {deleteError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {deleteError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                disabled={deletingResume}
                className="flex-1 bg-[#0C0E20] hover:bg-[#1C2040] border border-[#1F223D] text-slate-300 hover:text-white font-bold py-2.5 rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingResume}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {deletingResume ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5" /> Yes, Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
