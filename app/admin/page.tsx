"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, decodeToken } from "@/lib/api";
import Sidebar from "@/app/_components/Sidebar";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, 
  Users, 
  Search, 
  UserCheck, 
  Trash2, 
  Clock, 
  CheckCircle,
  Award,
  Lock,
  BookOpen,
  ArrowLeft,
  Loader2
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  
  // Auth state
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState("");
  
  // Platform stats
  const [stats, setStats] = useState({
    total_users: 0,
    total_interviews: 0,
    completed_interviews: 0,
    completion_rate: 0.0,
    average_score: 0.0
  });

  // Users list
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Authenticate Admin access
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const payload = decodeToken(token);
    if (payload?.email) {
      setCurrentAdminEmail(payload.email);
    }

    const checkAdmin = async () => {
      try {
        const res = await apiFetch("/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.is_admin) {
            setAuthorized(true);
            fetchStats();
            fetchUsers();
          } else {
            setAuthorized(false);
          }
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load admin statistics", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users list", err);
    }
  };

  const handleToggleAdmin = async (email: string) => {
    if (email === currentAdminEmail) {
      alert("You cannot revoke your own admin rights.");
      return;
    }

    if (!confirm(`Are you sure you want to toggle administrative access for ${email}?`)) {
      return;
    }

    setActionLoading(email);
    try {
      const res = await apiFetch(`/admin/users/${email}/toggle-admin`, {
        method: "PUT"
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to update user privilege level.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === currentAdminEmail) {
      alert("You cannot delete your own active administrator account.");
      return;
    }

    if (!confirm(`⚠️ CRITICAL WARNING: Are you sure you want to permanently delete the user ${email}?\n\nThis will purge their user account, uploaded resumes, generated interviews, evaluation reports, and notifications. This action is IRREVERSIBLE.`)) {
      return;
    }

    setActionLoading(email);
    try {
      const res = await apiFetch(`/admin/users/${email}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to purge user records.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter users based on query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm font-medium text-slate-500">Verifying administrator credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Access denied state
  if (authorized === false) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm max-w-md">
            <Lock className="h-14 w-14 text-red-500 mx-auto mb-5" />
            <h2 className="text-2xl font-bold text-slate-800">
              Administrative Privileges Required
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              This system control area is reserved for platform administrators. Your account does not possess the credentials to enter.
            </p>
            <Link href="/dashboard" className="mt-8 inline-block">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Dashboard
              </Button>
            </Link>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              System Control Panel
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Administrative Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/database">
              <Button variant="outline" className="border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-semibold h-9 shadow-sm">
                Database Diagnostics
              </Button>
            </Link>
            <Link href="/ai-settings">
              <Button variant="outline" className="border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-semibold h-9 shadow-sm">
                AI Settings
              </Button>
            </Link>
          </div>
        </div>


        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</span>
              <div className="p-2 rounded-lg bg-purple-50"><Users className="h-4 w-4 text-purple-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews</span>
              <div className="p-2 rounded-lg bg-indigo-50"><BookOpen className="h-4 w-4 text-indigo-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total_interviews}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              <div className="p-2 rounded-lg bg-green-50"><CheckCircle className="h-4 w-4 text-green-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.completed_interviews}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</span>
              <div className="p-2 rounded-lg bg-amber-50"><Clock className="h-4 w-4 text-amber-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.completion_rate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Score</span>
              <div className="p-2 rounded-lg bg-rose-50"><Award className="h-4 w-4 text-rose-500" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.average_score}<span className="text-xs text-slate-400 font-normal">/10</span></p>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                User Registry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Toggle privileges or manage accounts.</p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50">
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-4 py-3.5">Email Address</th>
                  <th className="px-4 py-3.5">Registered On</th>
                  <th className="px-4 py-3.5">Privilege Level</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((item) => {
                    const isSelf = item.email === currentAdminEmail;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 text-indigo-600 font-bold text-xs flex items-center justify-center border border-indigo-100">
                              {item.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700">
                              {item.name}
                              {isSelf && <span className="text-[9px] font-normal text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full ml-1.5">You</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 font-mono text-[11px]">
                          {item.email}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          {item.is_admin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                              Administrator
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Platform Member
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(item.email)}
                              disabled={isSelf || actionLoading === item.email}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.is_admin
                                  ? "bg-purple-50 border-purple-100 text-purple-500 hover:bg-purple-100"
                                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-purple-500 hover:border-purple-200"
                              } disabled:opacity-30 disabled:pointer-events-none`}
                              title={item.is_admin ? "Revoke admin rights" : "Grant admin rights"}
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(item.email)}
                              disabled={isSelf || actionLoading === item.email}
                              className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-30 disabled:pointer-events-none"
                              title="Purge user account & history"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                      No matching user accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
