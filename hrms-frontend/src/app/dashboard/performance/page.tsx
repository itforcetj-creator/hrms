"use client";

import React, { useEffect, useState } from "react";
import { PerformanceService } from "@/services/performance.service";
import { Goal, ReviewCycle } from "@/types/hr";
import { motion, AnimatePresence } from "framer-motion";
import { Target, TrendingUp, CheckCircle2, Clock, Plus, BarChart3, X, Loader } from "lucide-react";

const PerformancePage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", description: "" });
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const g = await PerformanceService.getMyGoals();
      const c = await PerformanceService.getReviewCycles();
      setGoals(g || []);
      setCycles(c || []);
    } catch (error) {
      console.error("Failed to fetch performance data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    setSavingGoal(true);
    try {
      const newGoal = await PerformanceService.createGoal({
        title: goalForm.title,
        description: goalForm.description,
        progress: 0,
        status: "IN_PROGRESS",
      });
      setGoals(prev => [...prev, newGoal]);
      setShowGoalModal(false);
      setGoalForm({ title: "", description: "" });
    } catch (error) {
      console.error("Failed to create goal:", error);
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 font-display">Performance & Goals</h1>
          <p className="text-slate-400">Track your objectives, key results, and upcoming review cycles.</p>
        </div>
        <button
          onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 font-medium"
        >
          <Plus size={18} />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals Section */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white/90">
             <Target className="text-indigo-400" size={22}/> Current Objectives (OKRs)
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {loading ? (
                <div className="p-20 text-center text-slate-500 italic bg-white/5 rounded-3xl border border-white/5">Loading your goals...</div>
            ) : goals.length === 0 ? (
                <div className="p-20 text-center text-slate-500 italic bg-white/5 rounded-3xl border border-white/5">No goals set yet. Start by defining your first objective!</div>
            ) : (
                goals.map((g, idx) => (
                    <motion.div 
                        key={g.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[#1e293b]/40 backdrop-blur-sm border border-white/5 p-6 rounded-3xl hover:border-indigo-500/20 group transition-all"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-400 transition-colors">{g.title}</h3>
                                <p className="text-sm text-slate-400 max-w-lg">{g.description}</p>
                            </div>
                            <div className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                                {g.status}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                           <div className="flex justify-between text-xs font-bold mb-2">
                               <span className="text-slate-500">Progress</span>
                               <span className="text-indigo-400">{g.progress}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                               <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${g.progress}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-linear-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg"
                               />
                           </div>
                        </div>

                        {/* Key Results */}
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Key Results</p>
                            {g.key_results?.map(kr => (
                                <div key={kr.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                       <CheckCircle2 size={14} className={kr.current_value >= kr.target_value ? "text-emerald-400" : "text-slate-600"} />
                                       <span className="truncate">{kr.title}</span>
                                   </div>
                                   <span className="font-mono text-xs text-slate-400 shrink-0">{kr.current_value}/{kr.target_value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))
            )}
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-8">
            <div className="bg-linear-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <TrendingUp size={20} />
                    </div>
                    <h3 className="font-bold text-lg">Performance Insights</h3>
                </div>
                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                   You have 3 goals nearing their target date. Complete your key results to maintain your performance score.
                </p>
                <div className="bg-white/10 p-4 rounded-2xl flex items-center justify-between border border-white/20 shadow-inner">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Q2 Assessment</span>
                    <span className="text-xl font-bold">9.2 / 10</span>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={16} /> Active Review Cycles
                </h2>
                {cycles.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic bg-white/5 rounded-2xl border border-white/5">No active review cycles.</div>
                ) : (
                    cycles.map(cycle => (
                        <div key={cycle.id} className="bg-[#1e293b]/50 border border-white/5 p-5 rounded-2xl hover:border-purple-500/30 transition-all flex items-center justify-between gap-4">
                           <div className="overflow-hidden">
                               <p className="font-bold text-white truncate">{cycle.name}</p>
                               <p className="text-[10px] text-slate-500 mt-1">Status: {cycle.status} • Ends {new Date(cycle.end_date).toLocaleDateString()}</p>
                           </div>
                           <BarChart3 className="text-purple-500 shrink-0" size={24} />
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* Create Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Create New Goal</h3>
                <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Goal Title</label>
                  <input
                    required
                    value={goalForm.title}
                    onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Improve code quality"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    value={goalForm.description}
                    onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the goal and key results..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingGoal ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Goal"
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformancePage;
