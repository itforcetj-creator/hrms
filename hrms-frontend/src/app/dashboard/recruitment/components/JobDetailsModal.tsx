"use client";

import React, { useState } from "react";
import { UserRoundCheck, Star, Clock, ChevronDown, ChevronUp, MessageSquare, Plus, Check, Save } from "lucide-react";
import { Job, Candidate, InterviewNote } from "@/types/hr";
import { motion, AnimatePresence } from "framer-motion";

interface JobDetailsModalProps {
  job: Job;
  onClose: () => void;
  onHireCandidate: (id: number) => void;
  candidateActionId: number | null;
  canManage: boolean;
  interviewNotes: Record<number, InterviewNote[]>;
  onAddNote: (candidateId: number, score: number, comments: string) => Promise<void>;
  notesLoading: boolean;
}

const JobDetailsModal = ({
  job,
  onClose,
  onHireCandidate,
  candidateActionId,
  canManage,
  interviewNotes,
  onAddNote,
  notesLoading,
}: JobDetailsModalProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({ score: 5, comments: "" });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAddNote = async (candidateId: number) => {
    if (!newNote.comments.trim()) return;
    await onAddNote(candidateId, newNote.score, newNote.comments);
    setNewNote({ score: 5, comments: "" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-(--surface) border border-(--border) rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left: Job Info */}
        <div className="w-full md:w-80 bg-(--surface-hover) border-r border-(--border) p-8 overflow-y-auto">
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full border border-indigo-400/20">
              {job.department?.name || "Corporate"}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-4">{job.title}</h2>
          <div className="space-y-4 mb-8">
            <p className="text-sm leading-relaxed app-muted">{job.description}</p>
            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="app-muted">Experience:</span>
                <span className="font-semibold">{job.experience_level}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="app-muted">Salary:</span>
                <span className="font-semibold text-emerald-500">{job.salary_range}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Candidates List */}
        <div className="flex-1 flex flex-col min-h-0 bg-(--surface)">
          <div className="p-6 border-b border-(--border) flex items-center justify-between sticky top-0 bg-(--surface) z-10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <UserRoundCheck className="text-indigo-400" size={20} />
              Candidates ({job.candidates?.length || 0})
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-(--surface-hover) rounded-xl transition-all">
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {(!job.candidates || job.candidates.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center opacity-50 py-12">
                <Clock size={32} className="mb-2" />
                <p className="text-sm">No applications yet for this position.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase font-bold tracking-widest text-slate-500 border-b border-(--border)">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Applied</th>
                    {canManage && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {job.candidates.map((candidate) => (
                    <React.Fragment key={candidate.id}>
                      <tr className={`${expandedId === candidate.id ? "bg-indigo-500/5" : "hover:bg-(--surface-hover)"} transition-colors group`}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-sm">{candidate.full_name}</p>
                            <p className="text-[10px] app-muted">{candidate.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-medium">
                          <button
                            onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
                              expandedId === candidate.id ? "bg-indigo-600 text-white shadow-md" : "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20"
                            }`}
                          >
                            {notesLoading && expandedId === candidate.id ? (
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <MessageSquare size={14} />
                            )}
                            {interviewNotes[candidate.id]?.length || 0} Notes
                            {expandedId === candidate.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-xs app-muted">{formatDate(candidate.applied_at)}</td>
                        {canManage && (
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => onHireCandidate(candidate.id)}
                              disabled={candidate.status === "HIRED" || candidateActionId === candidate.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20"
                            >
                              <UserRoundCheck size={14} />
                              {candidate.status === "HIRED" ? "Employee" : "Hire"}
                            </button>
                          </td>
                        )}
                      </tr>
                      
                      <AnimatePresence>
                        {expandedId === candidate.id && (
                          <motion.tr 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-500/[0.03] border-b border-(--border)"
                          >
                            <td colSpan={canManage ? 5 : 4} className="px-8 py-6">
                              <div className="max-w-3xl">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-bold flex items-center gap-2">
                                    <Star size={16} className="text-amber-400" />
                                    Interview Scorecards
                                  </h5>
                                </div>

                                <div className="space-y-4 mb-6">
                                  {(interviewNotes[candidate.id] || []).length === 0 ? (
                                    <p className="text-sm app-muted italic">No feedback recorded yet.</p>
                                  ) : (
                                    interviewNotes[candidate.id].map((note) => (
                                      <div key={note.id} className="app-surface rounded-xl p-4 border border-(--border) shadow-xs">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                                              Score: {note.score}/5
                                            </span>
                                            <span className="text-xs app-muted">by {note.interviewer?.full_name || "Interviewer"}</span>
                                          </div>
                                          <span className="text-[10px] app-muted">{formatDate(note.created_at)}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed">{note.comments}</p>
                                      </div>
                                    ))
                                  )}
                                </div>

                                {canManage && (
                                  <div className="mt-6 pt-6 border-t border-(--border)/50">
                                    <h6 className="text-xs font-bold uppercase tracking-widest app-muted mb-4">Add Interview Feedback</h6>
                                    <div className="space-y-4">
                                      <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium">Rating:</label>
                                        <div className="flex gap-2">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() => setNewNote({ ...newNote, score: s })}
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                newNote.score === s ? "bg-indigo-600 text-white" : "bg-(--surface-hover) app-muted hover:text-indigo-400"
                                              }`}
                                            >
                                              {s}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <textarea
                                          value={newNote.comments}
                                          onChange={(e) => setNewNote({ ...newNote, comments: e.target.value })}
                                          placeholder="Share your interview impressions and technical assessment..."
                                          className="w-full bg-(--surface-hover) border border-(--border) rounded-xl p-4 text-sm focus:outline-hidden focus:border-indigo-500/50 min-h-[100px] transition-all"
                                        />
                                        <div className="flex justify-end">
                                          <button
                                            onClick={() => handleAddNote(candidate.id)}
                                            disabled={!newNote.comments.trim() || notesLoading}
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                          >
                                            <Save size={16} />
                                            Submit Evaluation
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JobDetailsModal;
