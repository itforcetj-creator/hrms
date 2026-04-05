"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Megaphone, X, CheckCheck, AlertTriangle, Info, Zap, ExternalLink } from "lucide-react";
import { NotificationService, AnnouncementService, AnnouncementInput } from "@/services/communication.service";
import { Notification, Announcement } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"announcements" | "notifications">("announcements");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<AnnouncementInput>({ title: "", content: "", priority: "INFO", target: "ALL" });
  const [submitting, setSubmitting] = useState(false);

  const isHROrAdmin = user?.role === "ADMIN" || user?.role === "HR";
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ann, notifs] = await Promise.all([
        AnnouncementService.getAll(),
        NotificationService.getAll(),
      ]);
      setAnnouncements(ann);
      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    await NotificationService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleDelete = async (id: number) => {
    await AnnouncementService.delete(id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await AnnouncementService.create(form);
      setAnnouncements(prev => [created, ...prev]);
      setShowCreateModal(false);
      setForm({ title: "", content: "", priority: "INFO", target: "ALL" });
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const priorityConfig = {
    INFO: { icon: <Info size={16} />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Info" },
    WARNING: { icon: <AlertTriangle size={16} />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Warning" },
    URGENT: { icon: <Zap size={16} />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Urgent" },
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Inbox</h1>
            <p className="text-slate-400 mt-1">Announcements & your personal notifications</p>
          </div>
          {(isHROrAdmin || user?.role === "DEPARTMENT_HEAD") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20"
            >
              <Megaphone size={16} />
              New Announcement
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 w-fit">
          {[
            { key: "announcements", label: "Announcements", icon: <Megaphone size={15} /> },
            { key: "notifications", label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: <Bell size={15} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "announcements" && (
              <motion.div key="announcements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {announcements.length === 0 && (
                  <div className="text-center py-16 text-slate-500">
                    <Megaphone size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No announcements yet.</p>
                  </div>
                )}
                {announcements.map(ann => {
                  const pc = priorityConfig[ann.priority] || priorityConfig.INFO;
                  return (
                    <motion.div
                      key={ann.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative p-6 rounded-2xl border backdrop-blur-sm ${pc.bg}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`${pc.color}`}>{pc.icon}</span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${pc.color}`}>{pc.label}</span>
                            {ann.target === "DEPARTMENT" && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                Department
                              </span>
                            )}
                          </div>
                          <h3 className="text-white font-semibold text-lg mb-1">{ann.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">{ann.content}</p>
                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <span>By {ann.author?.full_name || "HR Team"}</span>
                            <span>·</span>
                            <span>{new Date(ann.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        </div>
                        {isHROrAdmin && (
                          <button
                            onClick={() => handleDelete(ann.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {notifications.length > 0 && unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mb-4 transition-colors"
                  >
                    <CheckCheck size={15} />
                    Mark all as read
                  </button>
                )}
                <div className="space-y-3">
                  {notifications.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                      <Bell size={40} className="mx-auto mb-3 opacity-30" />
                      <p>You're all caught up!</p>
                    </div>
                  )}
                  {notifications.map(n => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${!n.is_read
                        ? "bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40"
                        : "bg-white/3 border-white/5 hover:border-white/10 opacity-60"
                        }`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-indigo-400" : "bg-slate-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{n.title}</p>
                        <p className="text-slate-400 text-sm mt-0.5">{n.message}</p>
                        <p className="text-slate-600 text-xs mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                      {n.link && (
                        <Link href={n.link} className="shrink-0 text-slate-500 hover:text-indigo-400 transition-colors">
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">New Announcement</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Announcement title..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Content</label>
                  <textarea
                    required
                    rows={4}
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="What's happening..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="INFO">Info</option>
                      <option value="WARNING">Warning</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Target</label>
                    <select
                      value={form.target}
                      onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="DEPARTMENT">Department Only</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  {submitting ? "Publishing..." : "Publish Announcement"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
