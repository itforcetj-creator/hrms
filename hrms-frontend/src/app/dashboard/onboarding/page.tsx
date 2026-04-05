"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, CheckCircle2, Circle, Plus, X, Calendar, User, Clock, Loader
} from "lucide-react";
import { OnboardingTask } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";

// Mock data — wire to real backend when available
const mockTasks: OnboardingTask[] = [
  { id: 1, user_id: 0, title: "Complete HR paperwork & contracts", description: "Sign employment contract, NDA, and company policy acknowledgements.", due_date: "2026-04-07", is_completed: true },
  { id: 2, user_id: 0, title: "IT account setup & equipment", description: "Receive laptop, setup email, VPN, Slack and two-factor authentication.", due_date: "2026-04-07", is_completed: true },
  { id: 3, user_id: 0, title: "Meet your team & manager", description: "Schedule 30-minute 1:1 intro calls with each team member.", due_date: "2026-04-09", is_completed: false },
  { id: 4, user_id: 0, title: "Complete security & compliance training", description: "Finish mandatory GDPR and cybersecurity awareness modules.", due_date: "2026-04-11", is_completed: false },
  { id: 5, user_id: 0, title: "Set up first 30-60-90 day goals", description: "Work with your manager to document your onboarding goals.", due_date: "2026-04-14", is_completed: false },
  { id: 6, user_id: 0, title: "Shadow a senior colleague for a day", description: "Spend a full day observing how the team handles day-to-day operations.", due_date: "2026-04-16", is_completed: false },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<OnboardingTask[]>(mockTasks);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });

  const isHROrAdmin = user?.role === "ADMIN" || user?.role === "HR";
  const completed = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: OnboardingTask = { id: Date.now(), user_id: 0, ...form, is_completed: false };
    setTasks(prev => [...prev, newTask]);
    setShowModal(false);
    setForm({ title: "", description: "", due_date: "" });
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    return !completed && new Date(dueDate) < new Date();
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Onboarding</h1>
            <p className="text-slate-400 mt-1">Your checklist for a smooth start at the company</p>
          </div>
          {isHROrAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all"
            >
              <Plus size={16} />
              Add Task
            </button>
          )}
        </div>

        {/* Progress Card */}
        <div className="bg-linear-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm">Overall Progress</p>
              <p className="text-4xl font-bold text-white mt-1">{progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Tasks Completed</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">{completed}<span className="text-slate-500 text-base font-normal">/{tasks.length}</span></p>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-indigo-500 to-purple-500 rounded-full"
            />
          </div>
          {progress === 100 && (
            <p className="text-emerald-400 text-sm font-medium mt-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> All tasks complete! Welcome aboard 🎉
            </p>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const overdue = isOverdue(task.due_date, task.is_completed);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all ${task.is_completed
                  ? "bg-white/3 border-white/5 opacity-60"
                  : overdue
                    ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                    : "bg-white/5 border-white/10 hover:border-indigo-500/40"
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 shrink-0 transition-all ${task.is_completed ? "text-emerald-400" : overdue ? "text-red-400/50 hover:text-red-400" : "text-slate-600 hover:text-indigo-400"}`}
                >
                  {task.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.is_completed ? "line-through text-slate-500" : "text-white"}`}>
                    {task.title}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{task.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-400" : "text-slate-500"}`}>
                      <Clock size={11} />
                      Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {overdue && " · Overdue"}
                    </span>
                  </div>
                </div>
                {task.is_completed && <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-1" />}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Add Onboarding Task</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Task Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Complete HR paperwork"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Instructions or details..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all">
                  Add Task
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
