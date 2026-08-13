"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/_components/Sidebar";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, ChevronDown, ChevronUp, AlertCircle, ArrowLeft, Lightbulb, Compass, MessageSquare, TrendingUp, Target, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";

function RadialProgress({ score, label, colorClass, bgClass }: {
  score: number;
  label: string;
  colorClass: string;
  bgClass: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const cleanScore = Math.max(0, Math.min(10, score));
  const strokeDashoffset = circumference - (cleanScore / 10) * circumference;
  const percent = Math.round((cleanScore / 10) * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-200"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className={colorClass}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-xl font-black text-slate-800">{cleanScore.toFixed(1)}</span>
          <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">/ 10</span>
        </div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${bgClass}`}>{label}</span>
    </div>
  );
}

export default function InterviewResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const fetchResult = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await apiFetch(`/interviews/${id}/result`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load evaluation results");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve results for this interview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchResult();
  }, [id]);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Formatting your evaluation report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Failed to Load Interview Results</h2>
          <p className="text-sm text-slate-500 mt-1">{error || "Results are not ready."}</p>
          <Link href="/dashboard" className="mt-6">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return "text-green-600 border-green-200 bg-green-50";
    if (score >= 5.0) return "text-amber-600 border-amber-200 bg-amber-50";
    return "text-red-600 border-red-200 bg-red-50";
  };

  const overallPercent = Math.round(((result.overall_score || 0) / 10) * 100);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 overflow-auto pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Performance Report</p>
            <h1 className="text-2xl font-bold text-slate-900">AI Evaluation Results</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/interview/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4" /> New Interview
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner Card - Score Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center gap-8 mb-6">
          {/* Score Rings */}
          <div className="grid grid-cols-3 gap-6 shrink-0 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <RadialProgress 
              score={result.overall_score || 0.0} 
              label="Overall" 
              colorClass="stroke-indigo-500"
              bgClass="text-indigo-600 bg-indigo-50"
            />
            <RadialProgress 
              score={result.technical_score || result.overall_score || 0.0} 
              label="Technical" 
              colorClass="stroke-green-500"
              bgClass="text-green-600 bg-green-50"
            />
            <RadialProgress 
              score={result.communication_score || result.overall_score || 0.0} 
              label="Communication" 
              colorClass="stroke-purple-500"
              bgClass="text-purple-600 bg-purple-50"
            />
          </div>

          {/* Overall Feedback */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md mb-2">
              <Award className="h-3 w-3" />
              Evaluation Complete
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Performance Summary</h2>
            <p className="text-sm text-slate-500 leading-relaxed mt-2">
              {result.overall_feedback}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Target className="h-3.5 w-3.5 text-indigo-500" />
                Score: {overallPercent}%
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                {result.evaluations?.length || 0} Questions Evaluated
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-green-500/5 blur-xl" />
            <h3 className="text-base font-bold text-green-700 mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-50 text-green-600 border border-green-100">
                <CheckCircle className="h-4 w-4" />
              </div>
              Key Strengths
            </h3>
            <ul className="space-y-3">
              {result.strengths && result.strengths.length > 0 ? (
                result.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0 mt-1.5" />
                    {strength}
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400 italic">No specific strengths highlighted.</li>
              )}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 blur-xl" />
            <h3 className="text-base font-bold text-amber-700 mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Lightbulb className="h-4 w-4" />
              </div>
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {result.weaknesses && result.weaknesses.length > 0 ? (
                result.weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    {weakness}
                  </li>
                ))
              ) : (
                <li className="text-xs text-slate-400 italic">No specific areas of improvement highlighted.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Question-by-Question Assessment */}
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          Question-by-Question Assessment
        </h3>

        <div className="space-y-3">
          {result.evaluations.map((evalItem: any, idx: number) => {
            const isExpanded = expandedIndex === idx;
            const scoreClass = getScoreColor(evalItem.score);

            return (
              <div 
                key={idx} 
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300"
              >
                {/* Accordion header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-all outline-none"
                >
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question {idx + 1}</span>
                    <h4 className="text-sm font-semibold text-slate-700 mt-1 line-clamp-1 sm:line-clamp-none">
                      {evalItem.question}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreClass}`}>
                      {evalItem.score} <span className="text-[9px] font-normal text-slate-400">/ 10</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5 bg-slate-50 text-sm leading-relaxed">
                    
                    {/* User answer */}
                    <div>
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Answer:</h5>
                      <div className="mt-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-600 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                        {evalItem.user_answer || <span className="italic text-slate-400">No answer submitted.</span>}
                      </div>
                    </div>

                    {/* Feedback grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h6 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-600 mb-2">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Evaluation Feedback
                        </h6>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {evalItem.feedback}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h6 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
                          <Lightbulb className="h-3.5 w-3.5" />
                          Improvement Tips
                        </h6>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {evalItem.improvement_tip}
                        </p>
                      </div>
                    </div>

                    {/* Model Answer */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <h6 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                        <Compass className="h-3.5 w-3.5" />
                        Model Solution Coverage
                      </h6>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {evalItem.correct_answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
