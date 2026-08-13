"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard,
  Bell,
  Settings,
  LogOut,
  ShieldAlert,
  User,
  ChevronRight,
  BookOpen,
  BriefcaseBusiness,
  UploadCloud,
  Clock,
  BarChart2,
  Award,
  Brain
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/interview/create", icon: BriefcaseBusiness, label: "Create Interview" },
  { href: "/dashboard/resume", icon: UploadCloud, label: "Resume" },
  { href: "/interview-history", icon: Clock, label: "Interview History" },
  { href: "/dashboard/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/achievements", icon: Award, label: "Achievements" },
  { href: "/interview/feedback", icon: Brain, label: "AI Feedback" },
  { href: "/ai-settings", icon: Settings, label: "Settings" },
  { href: "/account", icon: User, label: "Profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [userName, setUserName] = useState("");
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch("/profile");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.is_admin);
          setUserName(data.name || "");
          setUserInitial((data.name || "U").charAt(0).toUpperCase());
        }
      } catch { }

      try {
        const res = await apiFetch("/notifications");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }
      } catch { }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`fixed left-0 top-0 h-full z-50 flex flex-col bg-[#0B0F19] border-r border-[#1E254E]/45 transition-all duration-300 ease-in-out shadow-2xl ${expanded ? "w-56" : "w-16"
        }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-600/90 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        {expanded && (
          <span className="text-white font-bold text-sm truncate leading-tight tracking-wide">
            AI Mock<br />Interview
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all ${active
                  ? "bg-[#1E234D] text-[#6366F1] border border-[#30386C]/70 shadow-lg shadow-indigo-900/10"
                  : "text-slate-400 hover:bg-[#131730]/40 hover:text-white"
                }`}
            >
              <div className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {label === "Interview History" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {expanded && (
                <span className="text-xs font-semibold tracking-wide truncate">{label}</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            title="Admin Panel"
            className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all ${pathname === "/admin"
                ? "bg-purple-600 text-white"
                : "text-purple-400 hover:bg-white/5 hover:text-purple-300"
              }`}
          >
            <ShieldAlert className="h-5 w-5 shrink-0" />
            {expanded && <span className="text-sm font-medium truncate">Admin Panel</span>}
          </Link>
        )}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/5 p-3 space-y-1">
        <Link
          href="/account"
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
            {userInitial}
          </div>
          {expanded && (
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs font-bold truncate">{userName || "User"}</p>
              <p className="text-slate-500 text-[9px] font-semibold mt-0.5">View Profile</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          {expanded && <span className="text-xs font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
