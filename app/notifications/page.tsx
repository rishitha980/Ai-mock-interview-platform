"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/_components/Sidebar";
import { Bell, Loader2, Check, CheckSquare, AlertCircle, Info, Sparkles, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch("/notifications");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load notifications.");
      }
      const data = await res.json();
      setNotifications(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await apiFetch(`/notifications/${id}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch {
      // silent fail
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => handleMarkAsRead(n.id)));
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "welcome":
        return <Sparkles className="h-5 w-5 text-amber-500" />;
      case "success":
        return <Trophy className="h-5 w-5 text-green-500" />;
      case "info":
        return <Info className="h-5 w-5 text-indigo-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getNotifBg = (type: string, isRead: boolean) => {
    if (isRead) return "bg-slate-50 border-slate-200";
    switch (type) {
      case "welcome": return "bg-amber-50/50 border-amber-100";
      case "success": return "bg-green-50/50 border-green-100";
      case "info": return "bg-indigo-50/50 border-indigo-100";
      default: return "bg-white border-slate-200";
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "";
    const date = new Date(isoStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <div className="flex-1 ml-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-sm font-medium text-slate-500">Loading notifications...</p>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-0.5">Alerts & Updates</p>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Stay updated with your interview schedule and result evaluations.</p>
          </div>
          
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm hover:shadow"
            >
              <CheckSquare className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Bell className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-600">All caught up!</h3>
            <p className="text-xs text-slate-400 mt-1">You don't have any notifications at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  handleMarkAsRead(notif.id);
                  if (notif.link) router.push(notif.link);
                }}
                className={`group relative bg-white rounded-xl border p-5 shadow-sm hover:shadow transition-all cursor-pointer flex items-start gap-4 ${
                  notif.is_read
                    ? "border-slate-200 hover:border-slate-300"
                    : "border-indigo-200 shadow-indigo-500/5 hover:border-indigo-300"
                }`}
              >
                {/* Unread indicator */}
                {!notif.is_read && (
                  <span className="absolute top-5 left-2 h-2 w-2 rounded-full bg-indigo-500" />
                )}

                {/* Icon */}
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  notif.is_read ? "bg-slate-100 text-slate-400" : getNotifBg(notif.type, false)
                }`}>
                  {getNotifIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className={`text-sm font-bold truncate ${notif.is_read ? "text-slate-500" : "text-slate-800"}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${notif.is_read ? "text-slate-400" : "text-slate-600"}`}>
                    {notif.message}
                  </p>
                  
                  {notif.link && (
                    <span className="inline-block text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold mt-2.5">
                      View details →
                    </span>
                  )}
                </div>

                {/* Mark read button */}
                {!notif.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
