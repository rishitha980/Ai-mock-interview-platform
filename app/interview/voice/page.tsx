"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  MessageSquare,
  RotateCcw,
  Trophy,
  Target,
  Lightbulb,
  Plus,
  Play,
  Calendar,
  Building2,
  Briefcase,
  Sparkles,
  PhoneOff,
  Award,
  TrendingUp,
  BookOpen,
  Zap,
  Radio,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type InterviewPhase =
  | "dashboard"     // Voice Interview Dashboard (no ?id= param)
  | "loading"       // Loading session data
  | "ready"         // Loaded, waiting for user to click Start
  | "greeting"      // AI speaking greeting + Q1
  | "questioning"   // Question displayed, mic off, user can start mic
  | "listening"     // Mic active, user is talking
  | "evaluating"    // Submitted answer, AI is evaluating
  | "speaking"      // AI speaking feedback + next question
  | "final_summary" // AI speaking closing statement
  | "completed"     // Final report shown
  | "error";

interface PerQuestionFeedback {
  score: number;
  what_was_good: string;
  what_was_missing: string;
  technical_mistakes?: string;
  communication_mistakes?: string;
  grammar_suggestions?: string;
  better_sample_answer?: string;
  confidence_feedback?: string;
  improvement_tip: string;
}

interface FinalEvaluation {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  problem_solving_score: number;
  overall_feedback: string;
  strengths: string[];
  weaknesses: string[];
  improvement_areas: string[];
  mistakes?: string[];
  suggestions: string[];
  recommended_learning_topics: string[];
  motivational_message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCountdown = (timestamp: number | undefined, currentTime: number) => {
  if (!timestamp || timestamp <= 0) return { text: "Ready to start", isReady: true };
  const diff = timestamp * 1000 - currentTime;
  if (diff <= 0) return { text: "Ready to start", isReady: true };
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return { text: `Starts in ${hours}h ${minutes}m`, isReady: false };
  if (minutes > 0) return { text: `Starts in ${minutes}m ${seconds}s`, isReady: false };
  return { text: `Starts in ${seconds}s`, isReady: false };
};

const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const scoreColor = (n: number) =>
  n >= 8 ? "text-emerald-400" : n >= 6 ? "text-amber-400" : "text-rose-400";

const scoreBg = (n: number) =>
  n >= 8 ? "bg-emerald-500/10 border-emerald-500/30" : n >= 6 ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30";

const scoreLabel = (n: number) =>
  n >= 8 ? "Excellent" : n >= 6 ? "Good" : n >= 4 ? "Fair" : "Needs Work";

// ── Waveform animation component ──────────────────────────────────────────────

function SpeakingWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          style={{
            animationDelay: `${i * 0.08}s`,
            animationDuration: active ? `${0.5 + (i % 3) * 0.2}s` : "0s",
          }}
          className={`rounded-full w-1 transition-all duration-300 ${
            active
              ? "bg-indigo-400 animate-[waveBar_0.8s_ease-in-out_infinite_alternate]"
              : "bg-slate-700 h-1"
          }`}
          data-height={active ? undefined : "4px"}
        />
      ))}
    </div>
  );
}

// ── Mic pulse animation ───────────────────────────────────────────────────────

function MicPulse() {
  return (
    <div className="relative inline-flex items-center justify-center">
      <span className="absolute w-20 h-20 rounded-full bg-rose-500/20 animate-ping" />
      <span className="absolute w-16 h-16 rounded-full bg-rose-500/30 animate-ping [animation-delay:0.2s]" />
      <div className="relative w-14 h-14 rounded-full bg-rose-600 flex items-center justify-center shadow-xl shadow-rose-900/50">
        <Mic className="w-6 h-6 text-white" />
      </div>
    </div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const pct = Math.round((score / 10) * 100);
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  const color = score >= 8 ? "#10b981" : score >= 6 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="-mt-14 flex flex-col items-center">
        <span className="text-lg font-extrabold text-white">{score.toFixed(1)}</span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mt-8">{label}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VoiceInterviewPage() {
  const router = useRouter();

  // ── Fullscreen Helpers ──────────────────────────────────────────────────────
  const requestFullscreen = () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.warn("Fullscreen error:", err));
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request not supported:", e);
    }
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => console.warn("Fullscreen exit error:", err));
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      }
    } catch (e) {
      console.warn("Fullscreen exit error:", e);
    }
  };

  // Dashboard state
  const [interviews, setInterviews] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Session
  const [sessionError, setSessionError] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [role, setRole] = useState<string>("Software Engineer");
  const [company, setCompany] = useState<string>("the company");
  const [interviewType, setInterviewType] = useState<string>("Technical");

  // Flow
  const [phase, setPhase] = useState<InterviewPhase>("loading");
  const [subtitle, setSubtitle] = useState("");
  const [feedbacks, setFeedbacks] = useState<(PerQuestionFeedback | null)[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<PerQuestionFeedback | null>(null);
  const [finalEval, setFinalEval] = useState<FinalEvaluation | null>(null);

  // Voice
  const [transcript, setTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [notes, setNotes] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const recognitionRef = useRef<any>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Derived state
  const isSpeaking = phase === "speaking" || phase === "greeting" || phase === "final_summary";
  const isListening = phase === "listening";
  const sessionStarted = ["questioning", "listening", "evaluating", "speaking", "greeting", "final_summary"].includes(phase);
  const progressPct = questions.length > 0 ? Math.round((currentIdx / questions.length) * 100) : 0;

  // ── Speech Recognition setup ───────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSpeechError(
        "Speech Recognition is not supported in this browser. Please use Chrome or Edge for voice input."
      );
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let t = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      setTranscript(t);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") {
        setSpeechError("Microphone access was denied. Please allow microphone permission and try again.");
      } else if (e.error !== "no-speech") {
        setSpeechError(`Microphone error: ${e.error}. Please check your mic and try again.`);
      }
    };
    rec.onend = () => {
      // do not auto-restart — user controls mic via button
    };
    recognitionRef.current = rec;
    return () => rec.abort();
  }, []);

  // ── Interview timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionStarted) return;
    const t = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [sessionStarted]);

  // ── Dashboard clock ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "dashboard") return;
    setCurrentTime(Date.now());
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Load session ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSession = async () => {
      const urlId = new URLSearchParams(window.location.search).get("id");
      try {
        if (!urlId) {
          setPhase("dashboard");
          setDashboardLoading(true);
          try {
            const res = await apiFetch("/interviews");
            if (res.ok) {
              const data = await res.json();
              setInterviews((Array.isArray(data) ? data : []).reverse());
            }
          } catch (err) {
            console.error("Failed to load dashboard interviews:", err);
          } finally {
            setDashboardLoading(false);
          }
          return;
        }

        // Load interview by ID from API
        const res = await apiFetch(`/interviews/${urlId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setInterviewId(data.id || urlId);
            setQuestions(data.questions);
            setAnswers(new Array(data.questions.length).fill(""));
            setFlagged(new Array(data.questions.length).fill(false));
            setFeedbacks(new Array(data.questions.length).fill(null));
            setRole(data.role || "Software Engineer");
            setCompany(data.company_name || "the company");
            setInterviewType(data.interview_type || "Technical");
            setTechStack(data.tech_stack || []);
            setPhase("ready");
            return;
          }
        }

        // Fallback to sessionStorage
        const raw = sessionStorage.getItem("voice_interview_session");
        if (!raw) {
          setSessionError("No interview session found. Please create an interview from your dashboard.");
          setPhase("error");
          return;
        }
        const session = JSON.parse(raw);
        if (!Array.isArray(session.questions) || session.questions.length === 0) {
          setSessionError("Interview questions could not be loaded. Please start a new interview.");
          setPhase("error");
          return;
        }
        setInterviewId(session.id || urlId);
        setQuestions(session.questions);
        setAnswers(new Array(session.questions.length).fill(""));
        setFlagged(new Array(session.questions.length).fill(false));
        setFeedbacks(new Array(session.questions.length).fill(null));
        setRole(session.role || "Software Engineer");
        setCompany(session.company || "the company");
        setInterviewType(session.interview_type || "Technical");
        setTechStack(session.tech_stack || session.tech || []);
        setPhase("ready");
      } catch {
        setSessionError("Failed to load interview session. Please try again.");
        setPhase("error");
      }
    };

    loadSession();
  }, []);

  // ── Text-to-Speech ─────────────────────────────────────────────────────────
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!text) { onDone?.(); return; }
      setSubtitle(text);
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
      recognitionRef.current?.stop();

      if (isMuted) {
        speakTimerRef.current = setTimeout(() => { setSubtitle(""); onDone?.(); }, 500);
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setSubtitle(""); onDone?.(); return;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utter;

      // Pick best available voice
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            v.name.toLowerCase().includes("natural") ||
            v.name.toLowerCase().includes("neural") ||
            v.name.toLowerCase().includes("google uk english female") ||
            v.name.toLowerCase().includes("samantha") ||
            v.name.toLowerCase().includes("karen") ||
            v.name.toLowerCase().includes("aria") ||
            v.name.toLowerCase().includes("female")
        );
        if (preferred) utter.voice = preferred;
      };
      window.speechSynthesis.getVoices().length > 0
        ? loadVoices()
        : (window.speechSynthesis.onvoiceschanged = loadVoices);

      utter.rate = 0.92;
      utter.pitch = 1.02;
      utter.volume = 1.0;

      utter.onend = () => { setSubtitle(""); onDone?.(); };
      utter.onerror = () => { setSubtitle(""); onDone?.(); };

      // Safety timeout
      const safetyMs = Math.max(6000, text.split(" ").length * 650);
      speakTimerRef.current = setTimeout(() => {
        window.speechSynthesis.cancel();
        setSubtitle("");
        onDone?.();
      }, safetyMs);

      window.speechSynthesis.speak(utter);
    },
    [isMuted]
  );

  // Exit fullscreen if interview finishes or fails
  useEffect(() => {
    if (["completed", "error", "dashboard"].includes(phase)) {
      exitFullscreen();
    }
  }, [phase]);

  const handleEndInterview = async () => {
    if (confirm("Are you sure you want to end this interview session? We will generate your report now.")) {
      window.speechSynthesis?.cancel();
      exitFullscreen();
      
      const hasAnswers = answers.some((a) => a && a.trim());
      if (hasAnswers) {
        await fetchAndSpeakFinalSummary(answers);
      } else {
        router.push("/interview/voice");
      }
    }
  };

  // ── Start Interview ────────────────────────────────────────────────────────
  const handleStartInterview = useCallback(async () => {
    if (questions.length === 0) return;

    // Request mic permission first
    try {
      if (typeof window !== "undefined" && window.location.search.includes("mock=true")) {
        console.warn("Mock mode: bypassing microphone access check");
      } else {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      setSpeechError(
        "Microphone access denied. Please allow microphone permission in your browser settings and try again."
      );
      return;
    }

    requestFullscreen();

    const greeting = `Hello! Welcome to your ${interviewType} interview for the ${role} position${company !== "the company" ? ` at ${company}` : ""}. I am your AI interviewer today. We have ${questions.length} questions prepared for you. Please speak your answers clearly into your microphone. Let's begin with our first question: ${questions[0]}`;
    setPhase("greeting");
    speakText(greeting, () => {
      setPhase("questioning");
    });
  }, [questions, role, company, interviewType, speakText]);

  // ── Mic controls ───────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    window.speechSynthesis?.cancel();
    setTranscript("");
    setSpeechError("");
    setPhase("listening");
    try {
      recognitionRef.current?.start();
    } catch {
      // already started — ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setPhase("questioning");
  }, []);

  const toggleMic = useCallback(() => {
    if (phase === "listening") stopListening();
    else if (phase === "questioning") startListening();
  }, [phase, startListening, stopListening]);

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleSubmitAnswer = async () => {
    const answer = transcript.trim();
    if (!answer) {
      setSpeechError("Please speak or type your answer before submitting.");
      return;
    }

    const updatedAnswers = [...answers];
    updatedAnswers[currentIdx] = answer;
    setAnswers(updatedAnswers);

    stopListening();
    setPhase("evaluating");
    setTranscript("");
    setSpeechError("");

    const isLast = currentIdx === questions.length - 1;

    try {
      const res = await apiFetch("/voice/evaluate-answer", {
        method: "POST",
        body: JSON.stringify({
          question: questions[currentIdx],
          answer,
          question_number: currentIdx + 1,
          total_questions: questions.length,
          next_question: isLast ? null : questions[currentIdx + 1],
          role,
          interview_type: interviewType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Evaluation failed");

      const fb: PerQuestionFeedback = data.feedback || {
        score: 7,
        what_was_good: "Good effort on your answer.",
        what_was_missing: "Adding more specific examples would strengthen your response.",
        improvement_tip: "Practice explaining concepts with concrete real-world scenarios.",
      };

      const updatedFeedbacks = [...feedbacks];
      updatedFeedbacks[currentIdx] = fb;
      setFeedbacks(updatedFeedbacks);
      setCurrentFeedback(fb);

      const spokenResponse: string =
        data.spoken_response ||
        (isLast
          ? "Thank you for your answer. That concludes our interview."
          : `Good response. Let's move to our next question: ${questions[currentIdx + 1]}`);

      setPhase("speaking");
      speakText(spokenResponse, () => {
        if (isLast) {
          fetchAndSpeakFinalSummary(updatedAnswers);
        } else {
          setCurrentIdx((prev) => prev + 1);
          setPhase("questioning");
        }
      });
    } catch (err: any) {
      console.error("evaluate-answer failed:", err);
      // Graceful fallback — keep interview moving
      setPhase("speaking");
      if (isLast) {
        fetchAndSpeakFinalSummary(updatedAnswers);
      } else {
        const nextQ = questions[currentIdx + 1];
        speakText(`Good response. Moving to our next question: ${nextQ}`, () => {
          setCurrentIdx((prev) => prev + 1);
          setPhase("questioning");
        });
      }
    }
  };

  const navigateToQuestion = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= questions.length) return;
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentIdx] = transcript;
      // Load target question's answer into transcript
      setTranscript(updated[newIdx] || "");
      return updated;
    });
    setCurrentIdx(newIdx);
    setSpeechError("");
  };

  const handleNext = () => {
    if (transcript.trim()) {
      handleSubmitAnswer();
    } else {
      if (currentIdx < questions.length - 1) {
        navigateToQuestion(currentIdx + 1);
      } else {
        handleSubmitAnswer();
      }
    }
  };

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const updated = [...prev];
      updated[idx] = !updated[idx];
      return updated;
    });
  };

  // ── Final summary ──────────────────────────────────────────────────────────
  const fetchAndSpeakFinalSummary = async (finalAnswers: string[]) => {
    setPhase("final_summary");
    try {
      const res = await apiFetch("/voice/final-summary", {
        method: "POST",
        body: JSON.stringify({
          questions,
          answers: finalAnswers,
          role,
          interview_type: interviewType,
          company,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Summary failed");

      if (data.evaluation) setFinalEval(data.evaluation);

      const spokenSummary: string =
        data.spoken_summary ||
        "Congratulations, you have completed your interview! Your detailed evaluation report is now ready.";

      speakText(spokenSummary, () => {
        submitToGrading(finalAnswers);
        setPhase("completed");
      });
    } catch {
      speakText(
        "Congratulations, you have completed your interview! Your evaluation report is now ready.",
        () => {
          submitToGrading(finalAnswers);
          setPhase("completed");
        }
      );
    }
  };

  const submitToGrading = async (finalAnswers: string[]) => {
    if (!interviewId) return;
    try {
      await apiFetch(`/interviews/${interviewId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: questions.map((q, i) => ({ question: q, answer: finalAnswers[i] || "" })),
        }),
      });
    } catch {}
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: Voice Interview Dashboard ─────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "dashboard") {
    const activeInterviews = interviews.filter((i) => i.status !== "completed");
    const completedInterviews = interviews.filter((i) => i.status === "completed");

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-16 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Radio className="h-4 w-4" /> AI Voice Interview Hub
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  Voice Interview Schedule
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Your upcoming and completed AI mock interviews. The Start button unlocks at your scheduled time.
                </p>
              </div>
              <Link
                href="/interview/create"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 shrink-0"
              >
                <Plus className="h-4 w-4" /> Create Interview
              </Link>
            </div>

            {/* Scheduled & Ready */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                Scheduled & Ready ({activeInterviews.length})
              </h2>

              {dashboardLoading ? (
                <div className="py-16 text-center bg-slate-800/30 border border-slate-800 rounded-2xl">
                  <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Loading your interviews...</p>
                </div>
              ) : interviews.length === 0 ? (
                <div className="py-16 text-center bg-slate-800/30 border border-slate-800 rounded-2xl space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">No interviews created yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Create your first AI mock interview to get started.</p>
                  </div>
                  <Link
                    href="/interview/create"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    <Plus className="h-4 w-4" /> Create Interview
                  </Link>
                </div>
              ) : activeInterviews.length === 0 ? (
                <div className="py-16 text-center bg-slate-800/30 border border-slate-800 rounded-2xl space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">No interviews scheduled yet</p>
                    <p className="text-slate-400 text-sm mt-1">Create your first AI mock interview to get started.</p>
                  </div>
                  <Link
                    href="/interview/create"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    <Plus className="h-4 w-4" /> Create Interview
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {activeInterviews.map((item: any) => {
                    const countdown = formatCountdown(item.scheduled_timestamp, currentTime);
                    const isReady = countdown.isReady || item.status === "ready";
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex flex-col gap-4 hover:border-indigo-500/40 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-white truncate text-base leading-tight">{item.role}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <p className="text-slate-400 text-xs truncate">{item.company_name || "Company"}</p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isReady
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {isReady ? "● READY" : "⏱ SCHEDULED"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                            <p className="text-slate-500 mb-0.5">Type</p>
                            <p className="text-slate-200 font-semibold">{item.interview_type || "Technical"}</p>
                          </div>
                          <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                            <p className="text-slate-500 mb-0.5">Difficulty</p>
                            <p className="text-slate-200 font-semibold">{item.difficulty_level || "Medium"}</p>
                          </div>
                          <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                            <p className="text-slate-500 mb-0.5">Questions</p>
                            <p className="text-slate-200 font-semibold">{item.num_questions || item.questions?.length || "—"} Qs</p>
                          </div>
                          <div className="bg-slate-900/60 rounded-lg px-3 py-2">
                            <p className="text-slate-500 mb-0.5">Duration</p>
                            <p className="text-slate-200 font-semibold">{item.duration_minutes || 30} min</p>
                          </div>
                        </div>

                        {item.scheduled_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
                            <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>{item.scheduled_date} {item.scheduled_time && `at ${item.scheduled_time}`}</span>
                          </div>
                        )}

                        {!isReady && (
                          <div className="text-center text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg py-2">
                            ⏱ {countdown.text}
                          </div>
                        )}

                        <button
                          disabled={!isReady}
                          onClick={() => {
                            const isMock = window.location.search.includes("mock=true");
                            router.push(`/interview/voice?id=${item.id}${isMock ? "&mock=true" : ""}`);
                          }}
                          className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all text-sm ${
                            isReady
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/30 transform hover:-translate-y-0.5"
                              : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          <Play className="h-4 w-4" />
                          {isReady ? "Start Voice Interview" : "Not Yet Available"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed */}
            {completedInterviews.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Completed Interviews ({completedInterviews.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {completedInterviews.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-white text-sm">{item.role}</p>
                          <p className="text-slate-400 text-xs">{item.company_name}</p>
                        </div>
                        {item.score > 0 && (
                          <span className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${scoreBg(item.score)} ${scoreColor(item.score)} border`}>
                            {item.score.toFixed(1)}/10
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{item.interview_type} • {item.difficulty_level}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">✓ Completed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: Error State ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center p-8">
          <div className="text-center max-w-md space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-rose-400" />
            </div>
            <h2 className="text-xl font-extrabold text-white">Session Error</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{sessionError}</p>
            <Link
              href="/interview/voice"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: Completed — Final Report ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (phase === "completed") {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
        <Sidebar />
        <div className="flex-1 ml-16 p-6 md:p-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">

            {/* Trophy header */}
            <div className="text-center space-y-3 py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-900/30">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-white">Interview Complete!</h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Congratulations on completing your {interviewType} interview for <strong className="text-white">{role}</strong>
                {company !== "the company" ? ` at ${company}` : ""}. Here is your full evaluation report.
              </p>
            </div>

            {/* Score rings */}
            {finalEval && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-base font-extrabold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-400" /> Performance Scores
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
                  <ScoreRing score={finalEval.overall_score} label="Overall" size={90} />
                  <ScoreRing score={finalEval.technical_score} label="Technical" size={90} />
                  <ScoreRing score={finalEval.communication_score} label="Communication" size={90} />
                  <ScoreRing score={finalEval.confidence_score} label="Confidence" size={90} />
                  <ScoreRing score={finalEval.problem_solving_score} label="Problem Solving" size={90} />
                </div>
                <div className="mt-6 bg-slate-900/60 rounded-xl p-4 text-sm text-slate-300 leading-relaxed border border-slate-700/40">
                  <p className="font-bold text-white mb-1">Overall Assessment</p>
                  <p>{finalEval.overall_feedback}</p>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            {finalEval && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                  <h3 className="font-extrabold text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {finalEval.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 text-emerald-400 shrink-0">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 space-y-3">
                  <h3 className="font-extrabold text-rose-400 flex items-center gap-2">
                    <XCircle className="h-5 w-5" /> Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {finalEval.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 text-rose-400 shrink-0">✗</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Suggestions & Learning */}
            {finalEval && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 space-y-3">
                  <h3 className="font-extrabold text-indigo-400 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" /> Personalized Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {finalEval.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 text-indigo-400 font-bold shrink-0">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 space-y-3">
                  <h3 className="font-extrabold text-amber-400 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" /> Recommended Learning
                  </h3>
                  <ul className="space-y-2">
                    {finalEval.recommended_learning_topics.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-0.5 text-amber-400 shrink-0">→</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Per-question breakdown */}
            {feedbacks.some((f) => f !== null) && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-400" /> Per-Question Breakdown
                </h2>
                {questions.map((q, i) => {
                  const fb = feedbacks[i];
                  if (!fb) return null;
                  return (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">Q{i + 1}</span>
                          <p className="text-white font-semibold text-sm mt-1 leading-relaxed">{q}</p>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <span className={`text-xl font-extrabold ${scoreColor(fb.score)}`}>{fb.score}</span>
                          <span className="text-[9px] text-slate-500 uppercase">/10</span>
                          <span className={`text-[9px] font-bold uppercase mt-0.5 ${scoreColor(fb.score)}`}>{scoreLabel(fb.score)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <p className="text-emerald-400"><strong className="text-emerald-300">Strong:</strong> {fb.what_was_good}</p>
                        <p className="text-amber-400"><strong className="text-amber-300">Missing:</strong> {fb.what_was_missing}</p>
                        {fb.technical_mistakes && fb.technical_mistakes !== "None" && (
                          <p className="text-rose-400"><strong className="text-rose-300">Technical:</strong> {fb.technical_mistakes}</p>
                        )}
                        {fb.communication_mistakes && fb.communication_mistakes !== "None" && (
                          <p className="text-cyan-400"><strong className="text-cyan-300">Communication:</strong> {fb.communication_mistakes}</p>
                        )}
                        {fb.better_sample_answer && (
                          <div className="sm:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                            <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-wider mb-1">Ideal Answer:</p>
                            <p className="text-slate-300 italic">&ldquo;{fb.better_sample_answer}&rdquo;</p>
                          </div>
                        )}
                        <p className="sm:col-span-2 text-indigo-400 pt-1 border-t border-slate-700/40 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 shrink-0" />
                          <strong className="text-indigo-300">Tip:</strong> {fb.improvement_tip}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Motivational footer */}
            {finalEval?.motivational_message && (
              <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-6 text-center">
                <Sparkles className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-base italic">&ldquo;{finalEval.motivational_message}&rdquo;</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
              <Link
                href="/interview/create"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all"
              >
                <Plus className="h-4 w-4" /> Schedule Another Interview
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold px-8 py-3.5 rounded-xl transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER: Live Interview Session Room ───────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (sessionStarted) {
    return (
      <div className="h-screen bg-[#0C0E20] text-slate-100 flex flex-col font-sans overflow-hidden">
        {/* ── HEADER ────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0e112a]/90 backdrop-blur-sm shrink-0">
          <h1 className="text-xl font-bold text-white tracking-wide">Interview Session</h1>
          <button
            onClick={handleEndInterview}
            className="border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-rose-500 rounded-xl px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200"
          >
            End Interview
          </button>
        </header>

        {/* ── TOP SUB-BAR ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800/80 bg-[#0e112a]/40 p-4 shrink-0">
          {/* Question Progress */}
          <div className="flex items-center gap-3 bg-[#131635]/40 border border-slate-800/60 rounded-xl p-3.5 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-semibold text-slate-200">
                Question {currentIdx + 1} / {questions.length}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3 bg-[#131635]/40 border border-slate-800/60 rounded-xl p-3.5 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timer</p>
              <p className="text-sm font-bold text-slate-200 font-mono">
                {formatTime(secondsElapsed)}
              </p>
            </div>
          </div>

          {/* AI Status */}
          <div className="flex items-center justify-between bg-[#131635]/40 border border-slate-800/60 rounded-xl p-3.5 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Status</p>
                <p className="text-xs font-semibold text-slate-300">
                  {phase === "speaking" || phase === "greeting" || phase === "final_summary"
                    ? "Speaking..."
                    : phase === "listening"
                    ? "Listening to you"
                    : phase === "evaluating"
                    ? "Analyzing answer..."
                    : "Waiting for answer"}
                </p>
              </div>
            </div>

            {/* AI Status wave visualizer */}
            <div className="flex items-center gap-0.5 h-6 px-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                <span
                  key={bar}
                  className={`w-0.5 bg-indigo-400 rounded-full transition-all duration-300 ${
                    isSpeaking || isListening ? "animate-pulse" : ""
                  }`}
                  style={{
                    height: isSpeaking || isListening
                      ? `${6 + Math.sin(bar * 1.2 + secondsElapsed * 2) * 8}px`
                      : "4px",
                    animationDelay: `${bar * 0.05}s`
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT GRID ─────────────────────────────────────────── */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-y-auto">
          {/* LEFT 2/3 COLUMN */}
          <div className="lg:col-span-2 flex flex-col gap-5 h-full">
            {/* Question Card */}
            <div className="relative bg-[#131635]/20 border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[220px] text-center shadow-lg">
              {/* Question Text */}
              <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed max-w-3xl">
                {questions[currentIdx] ? `"${questions[currentIdx]}"` : "Preparing question..."}
              </h2>

              {/* Tags Capsules */}
              <div className="flex flex-wrap gap-2 mt-5">
                <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-3.5 py-1 rounded-full text-xs font-semibold">
                  {interviewType}
                </span>
                {techStack.slice(0, 3).map((stack) => (
                  <span
                    key={stack}
                    className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-3.5 py-1 rounded-full text-xs font-semibold"
                  >
                    {stack}
                  </span>
                ))}
                {techStack.length === 0 && (
                  <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-3.5 py-1 rounded-full text-xs font-semibold">
                    Voice
                  </span>
                )}
              </div>
            </div>

            {/* Answer Text Area */}
            <div className="flex-1 flex flex-col gap-2 min-h-[250px] relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Type your answer here..."
                disabled={isSpeaking || phase === "evaluating"}
                className="w-full flex-1 bg-[#131635]/15 border border-slate-800/80 hover:border-slate-800 focus:border-indigo-500 rounded-2xl p-6 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-base resize-none transition-all leading-relaxed"
              />

              {speechError && (
                <div className="absolute bottom-4 left-4 right-4 flex items-start gap-2 bg-rose-950/80 border border-rose-800/40 rounded-xl p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{speechError}</span>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between bg-[#131635]/25 border border-slate-800/60 rounded-2xl p-4 shrink-0 shadow-lg">
              {/* Previous Button */}
              <button
                disabled={currentIdx === 0}
                onClick={() => navigateToQuestion(currentIdx - 1)}
                className="border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 disabled:opacity-30 disabled:pointer-events-none text-slate-300 rounded-xl px-5 py-2.5 font-bold transition-all text-sm"
              >
                Previous
              </button>

              {/* Center controls */}
              <div className="flex items-center gap-3">
                {/* Mic Trigger */}
                {isListening ? (
                  <button
                    onClick={toggleMic}
                    className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 transition-all duration-200"
                  >
                    <Mic className="h-5 w-5 animate-pulse" />
                  </button>
                ) : (
                  <button
                    onClick={toggleMic}
                    disabled={isSpeaking || phase === "evaluating"}
                    className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center justify-center transition-all duration-200"
                  >
                    <MicOff className="h-5 w-5" />
                  </button>
                )}

                {/* Stop/Record icon button */}
                <button
                  onClick={stopListening}
                  disabled={!isListening}
                  className="w-12 h-12 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white disabled:opacity-30 flex items-center justify-center transition-all duration-200"
                  title="Stop recording"
                >
                  <span className="w-4 h-4 rounded-sm bg-white" />
                </button>

                {/* Waveform visualizer indicator */}
                <div className="flex items-center gap-1.5 bg-[#171b44] border border-slate-800/60 rounded-xl px-3 py-2">
                  <span className="text-slate-500 font-bold text-xs">+</span>
                  <div className="flex items-center gap-0.5 h-4">
                    {[1, 2, 3, 4, 5, 6].map((bar) => (
                      <span
                        key={bar}
                        className={`w-0.5 bg-indigo-400 rounded-full transition-all duration-300 ${
                          isListening ? "animate-pulse" : ""
                        }`}
                        style={{
                          height: isListening
                            ? `${4 + Math.sin(bar * 1.5 + secondsElapsed * 3) * 6}px`
                            : "2px",
                          animationDelay: `${bar * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Next/Complete Button */}
              <button
                onClick={handleNext}
                disabled={phase === "evaluating"}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-7 py-2.5 font-bold transition-all text-sm shadow-lg shadow-indigo-950/40"
              >
                {currentIdx === questions.length - 1 ? "Complete" : "Next"}
              </button>
            </div>
          </div>

          {/* RIGHT 1/3 COLUMN */}
          <div className="bg-[#131635]/20 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-lg h-full">
            {/* Questions Tracker Grid */}
            <div>
              <h3 className="text-center font-bold text-indigo-400 text-xs uppercase tracking-wider mb-6">
                Questions
              </h3>

              <div className="grid grid-cols-2 gap-4 max-w-[200px] mx-auto justify-items-center mb-8">
                {questions.map((_, i) => {
                  const isCurrent = i === currentIdx;
                  const isAnswered = answers[i]?.trim().length > 0;
                  const isFlagged = flagged[i] === true;

                  if (isCurrent) {
                    return (
                      <div key={i} className="flex items-center gap-1 col-span-1 justify-center">
                        <span className="text-indigo-400 font-bold animate-pulse text-xs">&lsaquo;</span>
                        <button
                          onClick={() => toggleFlag(i)}
                          className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-indigo-950/50 scale-105"
                          title="Click to flag question"
                        >
                          {i + 1}
                        </button>
                        <span className="text-indigo-400 font-bold animate-pulse text-xs">&rsaquo;</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => navigateToQuestion(i)}
                      className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm transition-all hover:scale-105 ${
                        isAnswered
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          : isFlagged
                          ? "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                          : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Grid Legend */}
              <div className="border-t border-slate-850 pt-4 space-y-2.5 max-w-[180px] mx-auto text-[11px]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-slate-400 font-semibold">Answered</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                  <span className="text-slate-400 font-semibold">Active</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                  <span className="text-slate-400 font-semibold">Flagged</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                  <span className="text-slate-400 font-semibold">Unanswered</span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-8 border-t border-slate-850 pt-4 flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
                className="w-full h-[120px] bg-[#131635]/15 border border-slate-850 focus:border-indigo-500 rounded-xl p-3.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 resize-none transition-all leading-relaxed"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <Sidebar />

      <div className="flex-1 ml-16 flex flex-col h-screen overflow-hidden">

        {/* ── TOP STATUS BAR ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sessionStarted ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${sessionStarted ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              <span className="text-xs font-bold text-slate-200">{sessionStarted ? "LIVE" : "STANDBY"}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold text-white">{role} {company !== "the company" ? `@ ${company}` : ""}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{interviewType} Interview</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Question progress */}
            {sessionStarted && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                Q {currentIdx + 1} / {questions.length}
              </div>
            )}

            {/* Timer */}
            {sessionStarted && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-slate-200">
                <Clock className="h-4 w-4 text-indigo-400" />
                {formatTime(secondsElapsed)}
              </div>
            )}

            {/* Mute AI voice */}
            <button
              onClick={() => { const m = !isMuted; setIsMuted(m); if (m) window.speechSynthesis?.cancel(); }}
              className={`p-2 rounded-xl border transition-all ${isMuted ? "bg-rose-600/20 border-rose-500/50 text-rose-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}
              title={isMuted ? "Unmute AI Voice" : "Mute AI Voice"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {/* End interview */}
            {sessionStarted && (
              <button
                onClick={handleEndInterview}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all"
              >
                <PhoneOff className="h-3.5 w-3.5" /> End Interview
              </button>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* ── LEFT PANEL: AI Interviewer ──────────────────────────── */}
            <div className="flex flex-col gap-4">

              {/* Aria card */}
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                {/* Decorative glow */}
                <div className="absolute top-0 left-0 w-72 h-72 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative p-6 flex flex-col items-center gap-4">
                  {/* Avatar circle */}
                  <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 ${
                    isSpeaking
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-900/60 ring-4 ring-indigo-500/30"
                      : isListening
                      ? "bg-gradient-to-br from-slate-700 to-slate-800 ring-4 ring-slate-600/30"
                      : "bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-slate-700/30"
                  }`}>
                    {isSpeaking && (
                      <>
                        <span className="absolute inset-0 rounded-full border-4 border-indigo-400/30 animate-ping" />
                        <span className="absolute inset-0 rounded-full border-4 border-purple-400/20 animate-ping [animation-delay:0.3s]" />
                      </>
                    )}
                    <span className="text-4xl select-none">{isSpeaking ? "🎙️" : isListening ? "👂" : phase === "evaluating" ? "🤔" : "🤖"}</span>
                  </div>

                  <div className="text-center">
                    <p className="text-base font-extrabold text-white">Aria</p>
                    <p className="text-xs text-slate-400">AI {interviewType} Interviewer</p>
                  </div>

                  {/* Status badge */}
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    isSpeaking
                      ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
                      : isListening
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : phase === "evaluating"
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                      : phase === "questioning"
                      ? "bg-slate-700/50 border border-slate-600/40 text-slate-400"
                      : "bg-slate-800/50 border border-slate-700/40 text-slate-500"
                  }`}>
                    {isSpeaking && <><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> Speaking...</>}
                    {isListening && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Listening to you</>}
                    {phase === "evaluating" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing response...</>}
                    {phase === "questioning" && <><span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> Waiting for your answer</>}
                    {phase === "ready" && <><Sparkles className="h-3.5 w-3.5 animate-pulse" /> Ready to start</>}
                    {phase === "loading" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading session...</>}
                  </div>

                  {/* Waveform when speaking */}
                  <SpeakingWave active={isSpeaking} />

                  {/* Subtitle box */}
                  {subtitle && (
                    <div className="w-full bg-indigo-950/60 border border-indigo-500/20 rounded-xl px-4 py-3 text-center">
                      <p className="text-indigo-200 text-sm leading-relaxed italic">&ldquo;{subtitle}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ready lobby — start button */}
              {phase === "ready" && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                  <div className="space-y-1">
                    <p className="font-extrabold text-white flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Session Ready
                    </p>
                    <p className="text-xs text-slate-400">
                      {questions.length} questions prepared for your {interviewType.toLowerCase()} interview.
                      Your microphone will be activated when you click Start.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Target className="h-3 w-3" /> Questions Preview
                    </p>
                    {questions.slice(0, 3).map((q, i) => (
                      <p key={i} className="text-xs text-slate-400 truncate">
                        <span className="text-slate-600 font-bold mr-1">{i + 1}.</span>{q}
                      </p>
                    ))}
                    {questions.length > 3 && (
                      <p className="text-xs text-indigo-400 font-semibold">+{questions.length - 3} more questions...</p>
                    )}
                  </div>
                  {speechError && (
                    <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{speechError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleStartInterview}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-900/40 transition-all transform hover:-translate-y-0.5 text-sm"
                  >
                    <Mic className="h-4 w-4" /> Start Voice Interview
                  </button>
                </div>
              )}

              {/* Feedback card — shown after every answer from Q2 onwards */}
              {currentFeedback && sessionStarted && currentIdx > 0 && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="h-4 w-4" /> Q{currentIdx} Feedback
                    </span>
                    <span className={`text-base font-extrabold ${scoreColor(currentFeedback.score)}`}>
                      {currentFeedback.score}/10
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs leading-relaxed">
                    <p className="text-emerald-400"><strong className="text-emerald-300">✓ Strong:</strong> {currentFeedback.what_was_good}</p>
                    <p className="text-amber-400"><strong className="text-amber-300">△ Missing:</strong> {currentFeedback.what_was_missing}</p>
                    {currentFeedback.technical_mistakes && currentFeedback.technical_mistakes !== "None" && (
                      <p className="text-rose-400"><strong className="text-rose-300">⚠ Technical:</strong> {currentFeedback.technical_mistakes}</p>
                    )}
                    {currentFeedback.better_sample_answer && (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mt-2">
                        <p className="text-indigo-400 font-bold text-[10px] uppercase mb-1 flex items-center gap-1">
                          <Star className="h-3 w-3" /> Ideal Answer:
                        </p>
                        <p className="text-slate-300 italic">&ldquo;{currentFeedback.better_sample_answer}&rdquo;</p>
                      </div>
                    )}
                    <p className="text-indigo-400 pt-1 border-t border-slate-800 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span><strong className="text-indigo-300">Pro Tip:</strong> {currentFeedback.improvement_tip}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL: Candidate Response ────────────────────── */}
            <div className="flex flex-col gap-4">

              {/* Progress bar + question card */}
              {sessionStarted && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-indigo-400 uppercase tracking-wider">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span className="text-slate-500 font-semibold">{progressPct}% complete</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {/* Question dots */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {questions.map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-full transition-all duration-300 ${
                            i < currentIdx ? "w-2 h-2 bg-emerald-500"
                            : i === currentIdx ? "w-3 h-3 bg-indigo-400 ring-2 ring-indigo-400/30"
                            : "w-2 h-2 bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="border-t border-slate-800 pt-4">
                    <p className="text-white font-bold text-base leading-relaxed">
                      &ldquo;{questions[currentIdx]}&rdquo;
                    </p>
                  </div>

                  {/* Repeat question button */}
                  <button
                    onClick={() => {
                      setPhase("speaking");
                      speakText(questions[currentIdx], () => setPhase("questioning"));
                    }}
                    disabled={isSpeaking || isListening || phase === "evaluating"}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors font-semibold"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Repeat question aloud
                  </button>
                </div>
              )}

              {/* Mic controls + transcript */}
              {sessionStarted && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">

                  {/* Mic button */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    {isListening ? (
                      <MicPulse />
                    ) : (
                      <button
                        onClick={toggleMic}
                        disabled={isSpeaking || phase === "evaluating"}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 disabled:opacity-40 ${
                          phase === "evaluating"
                            ? "bg-slate-700 text-slate-500"
                            : "bg-indigo-600 hover:bg-indigo-500 hover:scale-105 text-white shadow-indigo-900/50"
                        }`}
                      >
                        {phase === "evaluating" ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <MicOff className="h-6 w-6" />
                        )}
                      </button>
                    )}
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                      {isListening
                        ? "Recording — speak now, click to pause"
                        : phase === "evaluating"
                        ? "Analysing your response..."
                        : isSpeaking
                        ? "Aria is speaking — please wait"
                        : "Click mic to start speaking"}
                    </p>
                    {isListening && (
                      <button
                        onClick={stopListening}
                        className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-all"
                      >
                        Pause Recording
                      </button>
                    )}
                  </div>

                  {/* Live transcript */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Your Response
                        {isListening && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                      </label>
                      {transcript && (
                        <button
                          onClick={() => setTranscript("")}
                          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" /> Clear
                        </button>
                      )}
                    </div>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder={
                        isListening
                          ? "Listening... your speech will appear here automatically"
                          : "Speak into your mic — or type your answer here directly..."
                      }
                      disabled={isSpeaking || phase === "evaluating"}
                      rows={5}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all disabled:opacity-60 leading-relaxed"
                    />
                  </div>

                  {/* Speech error */}
                  {speechError && (
                    <div className="flex items-start gap-2 bg-rose-950/50 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{speechError}</span>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!transcript.trim() || isSpeaking || phase === "evaluating"}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-900/40 transition-all transform hover:-translate-y-0.5 text-sm"
                  >
                    {phase === "evaluating" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Analysing response...</>
                    ) : currentIdx < questions.length - 1 ? (
                      <><span>Submit Answer</span><ChevronRight className="h-4 w-4" /></>
                    ) : (
                      <><span>Submit & Complete Interview</span><CheckCircle2 className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
