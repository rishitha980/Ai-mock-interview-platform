"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Bot, Check } from "lucide-react";
import { API_URL } from "@/lib/api";

const perks = [
  "AI-powered interview questions tailored to your role",
  "Instant feedback with detailed improvement tips",
  "Track your progress with performance analytics",
  "Build confidence with unlimited practice sessions",
];

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
        });
        google.accounts.id.renderButton(
          document.getElementById("google-signup-btn"),
          {
            theme: "outline",
            size: "large",
            width: "100%",
            shape: "rectangular",
            text: "signup_with",
          }
        );
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google sign-up failed");
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Unable to connect to the backend server. Please make sure the FastAPI server is running on port 8000.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasGoogleClientId =
    !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.includes("YOUR_GOOGLE_CLIENT_ID") &&
    !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.includes("123456789-");

  return (
    <div className="flex min-h-screen w-full bg-[#0B0F1A]">
      {/* Brand Panel (Left) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between relative overflow-hidden p-10 xl:p-14">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6C47FF] via-[#4C35CC] to-[#0B0F1A]" />
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(108,71,255,0.3) 0%, transparent 50%)"
          }}
        />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#A855F7]/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">AI Mock Interview</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight mb-4">
            Start Your Journey<br />
            <span className="text-white/70">to Success</span>
          </h2>
          <p className="text-sm text-white/60 leading-relaxed max-w-sm">
            Create your free account and start practicing interviews with AI today. No credit card required.
          </p>
        </div>

        {/* Bot illustration */}
        <div className="relative z-10 flex justify-center my-6">
          <div className="w-32 h-32 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-float">
            <Bot className="w-16 h-16 text-white" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-44 h-44 rounded-full border-2 border-dashed border-white/15 animate-spin-slow" />
          </div>
        </div>

        {/* Perks */}
        <div className="relative z-10 space-y-3">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <span className="text-xs text-white/75 leading-relaxed">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-12 xl:px-20">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6C47FF] to-[#A855F7] flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-base font-bold text-white">AI Mock Interview</span>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-1.5">
              Create Account 🚀
            </h1>
            <p className="text-sm text-slate-400">
              Get started with AI Mock Interviews today — it&apos;s free!
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                suppressHydrationWarning
                placeholder="John Doe"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#6C47FF]/60 focus:ring-2 focus:ring-[#6C47FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                suppressHydrationWarning
                placeholder="john@example.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#6C47FF]/60 focus:ring-2 focus:ring-[#6C47FF]/20"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  suppressHydrationWarning
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-[#6C47FF]/60 focus:ring-2 focus:ring-[#6C47FF]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/8" />
            <span className="text-xs text-slate-500 font-medium">or continue with</span>
            <div className="h-px flex-1 bg-white/8" />
          </div>

          {hasGoogleClientId ? (
            <div id="google-signup-btn" className="flex justify-center w-full" />
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-400 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                ⚠️ Google Sign-Up Config Required
              </p>
              <p className="text-slate-400 leading-relaxed">
                Configure <code className="text-amber-400">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your{" "}
                <code className="text-amber-400">.env.local</code> file and restart the dev server.
              </p>
            </div>
          )}

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#6C47FF] hover:text-[#A78BFA] transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
