"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import {
  User,
  Settings,
  Bell,
  Search,
  Mail,
  BookOpen,
  Briefcase,
  Target,
  FileText,
  Download,
  Camera,
  Trash2,
  Lock,
  ChevronDown,
  Loader2,
  Check,
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  college?: string;
  experience?: string;
  target_role?: string;
  skills?: string[];
  resume?: string;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInitial, setUserInitial] = useState("U");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [editFormData, setEditFormData] = useState({
    name: "",
    college: "",
    experience: "",
    target_role: "",
    skills: "",
    resume: "",
    password: "",
  });

  // Settings States
  const [activeTab, setActiveTab] = useState("General");
  const [theme, setTheme] = useState("Dark");
  const [language, setLanguage] = useState("English");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [showAiTips, setShowAiTips] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch("/profile");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load profile details.");
      }
      const data = await res.json();
      setProfile(data);
      if (data.name) {
        setUserInitial(data.name.charAt(0).toUpperCase());
      }
      setEditFormData({
        name: data.name || "",
        college: data.college || "",
        experience: data.experience || "Fresher",
        target_role: data.target_role || "",
        skills: (data.skills || []).join(", "),
        resume: data.resume || "",
        password: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred loading profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setErrorMsg("");
    setSuccessMsg("");

    const skillsArray = editFormData.skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload: any = {
      name: editFormData.name,
      college: editFormData.college,
      experience: editFormData.experience,
      target_role: editFormData.target_role,
      skills: skillsArray,
      resume: editFormData.resume,
    };

    if (editFormData.password.trim().length > 0) {
      payload.password = editFormData.password.trim();
    }

    try {
      const res = await apiFetch("/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      setSuccessMsg("Profile saved successfully!");
      setProfile(data.user);
      if (data.user.name) {
        setUserInitial(data.user.name.charAt(0).toUpperCase());
      }
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to permanently delete your account? This action is irreversible.")) {
      alert("Account deletion request submitted.");
    }
  };

  const handleDownloadResume = () => {
    if (!profile?.resume) {
      alert("No resume uploaded yet.");
      return;
    }
    // Simulate resume download
    const element = document.createElement("a");
    const file = new Blob(["Simulated resume file content for: " + profile.resume], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = profile.resume;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0A0D1A] text-white">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-[#6366F1]" />
            <p className="text-sm font-medium text-slate-500">Loading Profile & Settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0D1A] text-white">
      <Sidebar />

      <main className="flex-1 ml-16 p-6 lg:p-8 overflow-y-auto bg-[#0C0E20] space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E223D] pb-5">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Profile & Settings</h1>
            <p className="text-slate-400 text-xs mt-1">Manage details and personalized system preferences ⚙️</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-xl border border-[#1F223D] bg-[#13162C] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-[#5c4ae4] focus:ring-1 focus:ring-[#5c4ae4]/20"
              />
            </div>

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

        {/* Messaging banners */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-xs font-bold text-[#10B981]">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ───────────────── PROFILE CARD (Left Column) ───────────────── */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Profile</h2>

              {/* Avatar section */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border-2 border-[#1E223D] flex items-center justify-center text-white text-3xl font-black shadow-lg">
                    {userInitial}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 rounded-full bg-[#6366F1] border-2 border-[#13162C] text-white hover:bg-[#4f46e5] transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                /* Inline Edit Profile Form */
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">College</label>
                    <input
                      type="text"
                      value={editFormData.college}
                      onChange={(e) => setEditFormData({ ...editFormData, college: e.target.value })}
                      placeholder="e.g. PB Siddhartha College"
                      className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Experience</label>
                      <select
                        value={editFormData.experience}
                        onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                        className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1] cursor-pointer"
                      >
                        <option>Fresher</option>
                        <option>Junior (1-2 yrs)</option>
                        <option>Mid-Level (3-5 yrs)</option>
                        <option>Senior (5+ yrs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Role</label>
                      <input
                        type="text"
                        value={editFormData.target_role}
                        onChange={(e) => setEditFormData({ ...editFormData, target_role: e.target.value })}
                        placeholder="e.g. Full Stack Developer"
                        className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      value={editFormData.skills}
                      onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
                      placeholder="React, Next.js, MongoDB, SQL"
                      className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Resume File Name</label>
                    <input
                      type="text"
                      value={editFormData.resume}
                      onChange={(e) => setEditFormData({ ...editFormData, resume: e.target.value })}
                      placeholder="Sandy_Resume.pdf"
                      className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Password (optional)</label>
                    <input
                      type="password"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#6366F1]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-[#6366F1] hover:bg-[#4f46e5] text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      {updating ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-[#0C0E20] border border-[#1F223D] hover:bg-[#13162C] text-slate-400 text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Profile Info Display */
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</span>
                    <span className="text-xs font-bold text-white">{profile?.name}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</span>
                    <span className="text-xs font-bold text-white">{profile?.email}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">College</span>
                    <span className="text-xs font-bold text-white">{profile?.college || "Not set"}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</span>
                    <span className="text-xs font-bold text-white">{profile?.experience || "Fresher"}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Role</span>
                    <span className="text-xs font-bold text-white">{profile?.target_role || "Not set"}</span>
                  </div>

                  <div className="py-1.5 border-b border-[#1F223D]/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {profile?.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[9px] font-bold bg-[#1A1F38] border border-[#30386C] text-[#818CF8] px-2.5 py-1 rounded-full"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resume</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">{profile?.resume || "No resume uploaded"}</span>
                      {profile?.resume && (
                        <button
                          onClick={handleDownloadResume}
                          className="p-1 rounded-lg bg-[#0C0E20] border border-[#1F223D] text-slate-400 hover:text-white transition-colors"
                          title="Download Resume"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-8 bg-[#6366F1] hover:bg-[#4f46e5] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* ───────────────── SETTINGS CARD (Right Column) ───────────────── */}
          <div className="bg-[#13162C] border border-[#1F223D] rounded-2xl p-6 shadow-lg flex flex-col justify-between min-h-[500px]">
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Settings</h2>

              {/* Sub-tabs header */}
              <div className="flex gap-4 border-b border-[#1F223D] pb-3 text-xs">
                {["General", "Account", "Notifications"].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`font-semibold tracking-wide transition-all relative pb-3 ${
                        isActive ? "text-[#6366F1]" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#6366F1] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* General Tab View */}
              {activeTab === "General" && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-semibold text-slate-300">Theme</span>
                    <div className="relative">
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="appearance-none bg-[#0C0E20] border border-[#1F223D] text-xs text-white px-4 py-2 pr-8 rounded-xl outline-none focus:border-[#6366F1] cursor-pointer"
                      >
                        <option>Dark</option>
                        <option>Light</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-semibold text-slate-300">Language</span>
                    <div className="relative">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="appearance-none bg-[#0C0E20] border border-[#1F223D] text-xs text-white px-4 py-2 pr-8 rounded-xl outline-none focus:border-[#6366F1] cursor-pointer"
                      >
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Toggle switches */}
                  {[
                    { label: "Email Notifications", state: emailNotifications, toggle: setEmailNotifications },
                    { label: "Interview Reminders", state: interviewReminders, toggle: setInterviewReminders },
                    { label: "Sound Effects", state: soundEffects, toggle: setSoundEffects },
                    { label: "Show AI Tips", state: showAiTips, toggle: setShowAiTips },
                  ].map(({ label, state, toggle }) => (
                    <div key={label} className="flex items-center justify-between py-2">
                      <span className="text-xs font-semibold text-slate-300">{label}</span>
                      <button
                        onClick={() => toggle(!state)}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 ${
                          state ? "bg-[#6366F1]" : "bg-[#1E223D]"
                        }`}
                      >
                        <div
                          className={`w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 transform ${
                            state ? "translate-x-4.5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Account Tab View */}
              {activeTab === "Account" && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Verify account status, update authentication password, or diagnostic data settings.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Account Tier</label>
                    <div className="bg-[#0C0E20] border border-[#1F223D] rounded-xl px-3 py-2 text-xs font-bold text-[#10B981] flex items-center justify-between">
                      <span>Standard Developer</span>
                      <span className="text-[9px] uppercase tracking-widest bg-[#10B981]/15 px-2 py-0.5 rounded border border-[#10B981]/25">Active</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">OAuth Connections</label>
                    <p className="text-xs text-slate-500">No external SSO connections linked.</p>
                  </div>
                </div>
              )}

              {/* Notifications Tab View */}
              {activeTab === "Notifications" && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setup custom criteria for browser triggers, grading alerts, and system updates.
                  </p>
                  <div className="space-y-2">
                    {["Interview Results Evaluated", "Streak Renewal Reminder", "New Badges Unlocked"].map((pref) => (
                      <label key={pref} className="flex items-center gap-3 text-xs text-slate-300 select-none cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded bg-[#0C0E20] border-[#1F223D] text-[#6366F1] focus:ring-0 cursor-pointer" />
                        <span>{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-8 flex justify-center">
              <button
                onClick={handleDeleteAccount}
                className="bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md"
              >
                Delete Account
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
