"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronLeft, ChevronRight, Send, AlertTriangle, Play, HelpCircle, Brain, Volume2, VolumeX, Mic, MicOff, Clock, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function InterviewWizardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [interview, setInterview] = useState<any>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Voice State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Use a ref so recognition is created once and persists across question changes
  const recognitionRef = useRef<any>(null);

  // Timer Effect
  useEffect(() => {
    let timer: any;
    if (interview && interview.status === "pending" && !submitting) {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [interview, submitting]);

  // Speech Recognition Setup — created once on mount, not on each question change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            // Use functional update so we always read current answers + currentIdx
            setAnswers((prev) => {
              const updated = [...prev];
              setCurrentIdx((ci) => {
                const currentAnswer = updated[ci] || "";
                updated[ci] = currentAnswer + (currentAnswer ? " " : "") + finalTranscript.trim();
                return ci;
              });
              return updated;
            });
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech recognition error:", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []); // ← empty dep array: created once only

  // Clean voice states on question change
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [currentIdx]);

  const speakQuestion = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech Synthesis is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const currentQuestion = interview?.questions[currentIdx];
    if (!currentQuestion) return;

    const utterance = new SpeechSynthesisUtterance(currentQuestion);
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported or permitted in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchInterview = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await apiFetch(`/interviews/${id}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load interview metadata");
      }

      if (data.status === "completed") {
        router.push(`/interview/${id}/result`);
        return;
      }

      if (!window.location.search.includes("mode=text")) {
        router.replace(`/interview/voice?id=${id}`);
        return;
      }

      setInterview(data);
      setAnswers(new Array(data.questions.length).fill(""));
    } catch (err: any) {
      setError(err.message || "An error occurred while loading this session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchInterview();
  }, [id]);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = [...answers];
    updated[currentIdx] = e.target.value;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentIdx < interview.questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const emptyCount = answers.filter((a) => !a.trim()).length;
    if (emptyCount > 0) {
      if (!confirm(`You have left ${emptyCount} question(s) blank. Are you sure you want to submit?`)) {
        return;
      }
    }

    setError("");
    setSubmitting(true);

    try {
      const submissionPayload = {
        answers: interview.questions.map((q: string, idx: number) => ({
          question: q,
          answer: answers[idx] || "",
        })),
      };

      const res = await apiFetch(`/interviews/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(submissionPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Submission evaluation failed");
      }

      router.push(`/interview/${id}/result`);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || "Something went wrong during evaluation submission.");
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading interview room...</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute h-24 w-24 animate-ping rounded-full bg-indigo-500/10" />
            <div className="absolute h-20 w-20 animate-pulse rounded-full bg-purple-500/10" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-xl">
              <Brain className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Analyzing Your Submissions
          </h2>
          <p className="mt-3 text-sm text-slate-500 max-w-sm">
            Gemini is grading your answers and preparing comprehensive feedback tips. This might take a few moments.
          </p>
        </div>
      </div>
    );
  }

  if (error && !interview) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex flex-col items-center justify-center p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Failed to Load Interview Session</h2>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <Link href="/dashboard" className="mt-6">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = interview.questions[currentIdx];
  const answeredCount = answers.filter(a => a.trim().length > 0).length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1 ml-16 flex flex-col">
        {/* Top Session Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">{interview.role} Mock Interview</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{interview.experience} level</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-mono text-indigo-600">{formatTime(secondsElapsed)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="font-semibold">{answeredCount}/{interview.questions.length} answered</span>
            </div>
            <button 
                onClick={() => {
                  if (confirm("Exit practice session? Answers entered so far will not be submitted.")) {
                    router.push("/dashboard");
                  }
                }} 
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Quit Session
              </button>
          </div>
        </div>

        {/* Main Interview Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col">
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Progress</span>
              <span>Question {currentIdx + 1} of {interview.questions.length}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / interview.questions.length) * 100}%` }}
              />
            </div>
            {/* Question dots */}
            <div className="flex items-center gap-1.5 mt-3">
              {interview.questions.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    idx === currentIdx
                      ? "w-6 bg-indigo-600"
                      : answers[idx]?.trim()
                      ? "w-2.5 bg-green-400"
                      : "w-2.5 bg-slate-300"
                  }`}
                  title={`Question ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex-1 flex flex-col">
            
            {/* Question chip */}
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md mb-4 self-start">
              <HelpCircle className="h-3 w-3" />
              Recruiter Question
            </div>
            
            {/* Question text with speaker button */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg md:text-xl font-bold leading-relaxed text-slate-800 flex-1">
                {currentQuestion}
              </h3>
              <button
                onClick={speakQuestion}
                className={`p-2 rounded-lg border transition-all duration-300 shrink-0 ${
                  isSpeaking
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
                title={isSpeaking ? "Stop Reading" : "Read Question"}
              >
                {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            {/* Answer Area */}
            <div className="mt-6 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type Your Answer
                </label>
                
                {/* Voice Input controls */}
                <div className="flex items-center gap-3">
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500 font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Listening...
                    </span>
                  )}
                  <button
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-300 ${
                      isListening
                        ? "bg-red-50 border-red-200 text-red-500 shadow-sm animate-pulse"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50"
                    }`}
                    type="button"
                  >
                    {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {isListening ? "Stop Voice Mode" : "Voice Mode (Dictation)"}
                  </button>
                </div>
              </div>

              <textarea
                rows={8}
                value={answers[currentIdx]}
                onChange={handleAnswerChange}
                placeholder="Type details clarifying your thoughts, processes, examples, and technologies, or use Voice Mode to dictate your answer..."
                className="flex-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white resize-y leading-relaxed"
              />
              <div className="flex justify-between mt-1.5 text-[11px] text-slate-400 font-medium">
                <span>Provide as much technical detail as possible.</span>
                <span>{(answers[currentIdx] || "").length} characters</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {currentIdx < interview.questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-sm flex items-center gap-1"
                >
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 font-semibold text-white shadow-lg shadow-indigo-500/10 hover:from-indigo-600 hover:to-purple-700 flex items-center gap-1.5"
                >
                  Submit Interview
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
