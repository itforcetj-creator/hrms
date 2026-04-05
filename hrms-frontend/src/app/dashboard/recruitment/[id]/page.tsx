"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Calendar, CheckCircle2, GripVertical, MessageSquarePlus, Star, UserRoundCheck } from "lucide-react";
import { RecruitmentService } from "@/services/recruitment.service";
import { CandidateStatus, InterviewNote, RecruitmentCandidate, RecruitmentJobDetailsResponse } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";

const KANBAN_STATUSES: CandidateStatus[] = ["APPLIED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
const KANBAN_STYLE: Record<CandidateStatus, string> = {
  APPLIED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  INTERVIEW: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  OFFER: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  HIRED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

type NoteForm = { score: number; comments: string };
const INITIAL_NOTE_FORM: NoteForm = { score: 4, comments: "" };

const extractApiError = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (error as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
};

export default function RecruitmentJobPipelinePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const jobId = useMemo(() => Number(params?.id), [params]);
  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "DIRECTOR";

  const [details, setDetails] = useState<RecruitmentJobDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [candidateActionId, setCandidateActionId] = useState<number | null>(null);

  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [notesByCandidate, setNotesByCandidate] = useState<Record<number, InterviewNote[]>>({});
  const [notesLoadingByCandidate, setNotesLoadingByCandidate] = useState<Record<number, boolean>>({});
  const [notesErrorByCandidate, setNotesErrorByCandidate] = useState<Record<number, string>>({});
  const [noteFormByCandidate, setNoteFormByCandidate] = useState<Record<number, NoteForm>>({});
  const [noteSubmittingByCandidate, setNoteSubmittingByCandidate] = useState<Record<number, boolean>>({});

  const loadDetails = useCallback(async () => {
    if (!Number.isFinite(jobId) || jobId <= 0) {
      setError("Invalid job id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await RecruitmentService.getJobDetails(jobId);
      setDetails(data);
    } catch (err: unknown) {
      const status =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { status?: number } }).response?.status === "number"
          ? (err as { response: { status: number } }).response.status
          : undefined;

      if (status === 404) {
        const fallbackCandidates = await RecruitmentService.getCandidatesByJob(jobId);
        setDetails({
          job: {
            id: jobId,
            title: "Job Opening",
            description: "",
            department_id: 0,
            status: "OPEN",
            created_at: new Date().toISOString(),
            applications_count: fallbackCandidates.length,
          },
          candidates: fallbackCandidates,
        });
      } else {
        setError(extractApiError(err, "Failed to load recruitment pipeline."));
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const formatDate = (value?: string) => {
    if (!value) return "Recently";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Recently";
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const updateCandidateInState = (candidateId: number, updater: (candidate: RecruitmentCandidate) => RecruitmentCandidate) => {
    setDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        candidates: prev.candidates.map((c) => (c.id === candidateId ? updater(c) : c)),
      };
    });
  };

  const handleCandidateStatusChange = async (candidateId: number, nextStatus: CandidateStatus) => {
    const candidate = details?.candidates.find((c) => c.id === candidateId);
    if (!candidate || candidate.status === nextStatus) return;
    setCandidateActionId(candidateId);
    try {
      await RecruitmentService.updateCandidateStatus(candidateId, nextStatus);
      updateCandidateInState(candidateId, (c) => ({ ...c, status: nextStatus }));
    } catch (err: unknown) {
      setError(extractApiError(err, "Failed to update candidate status."));
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleHireCandidate = async (candidateId: number) => {
    setCandidateActionId(candidateId);
    try {
      await RecruitmentService.hireCandidate(candidateId);
      updateCandidateInState(candidateId, (c) => ({ ...c, status: "HIRED" }));
    } catch (err: unknown) {
      setError(extractApiError(err, "Failed to finalize hiring."));
    } finally {
      setCandidateActionId(null);
    }
  };

  const loadCandidateNotes = async (candidateId: number) => {
    if (notesLoadingByCandidate[candidateId]) return;
    setNotesLoadingByCandidate((prev) => ({ ...prev, [candidateId]: true }));
    setNotesErrorByCandidate((prev) => ({ ...prev, [candidateId]: "" }));
    try {
      const notes = await RecruitmentService.getInterviewNotes(candidateId);
      setNotesByCandidate((prev) => ({ ...prev, [candidateId]: notes || [] }));
      setNoteFormByCandidate((prev) => ({
        ...prev,
        [candidateId]: prev[candidateId] || { ...INITIAL_NOTE_FORM },
      }));
    } catch (err: unknown) {
      setNotesErrorByCandidate((prev) => ({
        ...prev,
        [candidateId]: extractApiError(err, "Failed to load interview notes."),
      }));
    } finally {
      setNotesLoadingByCandidate((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const toggleNotes = async (candidateId: number) => {
    setExpandedNotes((prev) => ({ ...prev, [candidateId]: !prev[candidateId] }));
    if (!notesByCandidate[candidateId]) {
      await loadCandidateNotes(candidateId);
    }
  };

  const updateNoteForm = (candidateId: number, patch: Partial<NoteForm>) => {
    setNoteFormByCandidate((prev) => ({
      ...prev,
      [candidateId]: { ...(prev[candidateId] || INITIAL_NOTE_FORM), ...patch },
    }));
  };

  const handleAddNote = async (candidateId: number) => {
    const form = noteFormByCandidate[candidateId] || INITIAL_NOTE_FORM;
    if (!form.comments.trim()) {
      setNotesErrorByCandidate((prev) => ({ ...prev, [candidateId]: "Please add note comments." }));
      return;
    }

    setNoteSubmittingByCandidate((prev) => ({ ...prev, [candidateId]: true }));
    setNotesErrorByCandidate((prev) => ({ ...prev, [candidateId]: "" }));
    try {
      const response = await RecruitmentService.addInterviewNote(candidateId, {
        score: form.score,
        comments: form.comments.trim(),
      });
      setNotesByCandidate((prev) => ({
        ...prev,
        [candidateId]: [response.note, ...(prev[candidateId] || [])],
      }));
      setNoteFormByCandidate((prev) => ({ ...prev, [candidateId]: { ...INITIAL_NOTE_FORM } }));
    } catch (err: unknown) {
      setNotesErrorByCandidate((prev) => ({
        ...prev,
        [candidateId]: extractApiError(err, "Failed to save interview note."),
      }));
    } finally {
      setNoteSubmittingByCandidate((prev) => ({ ...prev, [candidateId]: false }));
    }
  };

  const candidatesByStatus = useMemo(() => {
    const map: Record<CandidateStatus, RecruitmentCandidate[]> = {
      APPLIED: [],
      INTERVIEW: [],
      OFFER: [],
      HIRED: [],
      REJECTED: [],
    };
    (details?.candidates || []).forEach((candidate) => {
      map[candidate.status]?.push(candidate);
    });
    return map;
  }, [details?.candidates]);

  if (loading) {
    return <div className="p-10 text-slate-400 italic">Loading recruitment pipeline...</div>;
  }

  if (error && !details) {
    return (
      <div className="p-10">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10">
      <div className="mb-6">
        <Link href="/dashboard/recruitment" className="inline-flex items-center gap-2 text-sm app-muted hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Back to recruitment
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1e293b]/55 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{details?.job.title || "Job Opening"}</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm">
              <Building2 size={15} />
              {details?.job.department?.name || `Department #${details?.job.department_id || "-"}`}
            </p>
          </div>
          <div className="text-right text-sm text-slate-300">
            <p className="flex items-center justify-end gap-1.5">
              <Calendar size={14} />
              Posted {formatDate(details?.job.created_at)}
            </p>
            <p className="mt-1">{details?.candidates.length || 0} candidates</p>
          </div>
        </div>
        {details?.job.description && <p className="text-slate-300 mt-4">{details.job.description}</p>}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {KANBAN_STATUSES.map((status) => (
          <section
            key={status}
            className="rounded-2xl border border-white/10 bg-[#1e293b]/45 p-3 min-h-[280px]"
            onDragOver={(e) => {
              if (canManage) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!canManage) return;
              e.preventDefault();
              const candidateId = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isFinite(candidateId) && candidateId > 0) {
                void handleCandidateStatusChange(candidateId, status);
              }
            }}
          >
            <div className={`mb-3 rounded-lg border px-3 py-2 text-xs font-bold tracking-wider uppercase ${KANBAN_STYLE[status]}`}>
              <div className="flex items-center justify-between">
                <span>{status}</span>
                <span>{candidatesByStatus[status].length}</span>
              </div>
            </div>

            <div className="space-y-3">
              {candidatesByStatus[status].map((candidate) => (
                <article
                  key={candidate.id}
                  draggable={canManage}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(candidate.id))}
                  className="rounded-xl border border-white/10 bg-[#0f172a]/70 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-white">{candidate.full_name}</p>
                      <p className="text-[11px] text-slate-400 break-all">{candidate.email}</p>
                    </div>
                    {canManage && <GripVertical size={14} className="text-slate-500 shrink-0 mt-0.5" />}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">Applied {formatDate(candidate.applied_at)}</p>

                  {canManage && (
                    <div className="mt-3 space-y-2">
                      <select
                        value={candidate.status}
                        onChange={(e) => void handleCandidateStatusChange(candidate.id, e.target.value as CandidateStatus)}
                        disabled={candidateActionId === candidate.id}
                        className="w-full app-input rounded-lg px-2.5 py-1.5 text-[11px]"
                      >
                        {KANBAN_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void handleHireCandidate(candidate.id)}
                        disabled={candidate.status === "HIRED" || candidateActionId === candidate.id}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1.5 hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        <UserRoundCheck size={13} />
                        {candidate.status === "HIRED" ? "Hired" : "Mark as Hired"}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => void toggleNotes(candidate.id)}
                      className="inline-flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
                    >
                      <MessageSquarePlus size={13} />
                      {expandedNotes[candidate.id] ? "Hide Notes" : "Interview Notes"}
                    </button>

                    {expandedNotes[candidate.id] && (
                      <div className="mt-2 space-y-2">
                        {notesLoadingByCandidate[candidate.id] ? (
                          <p className="text-[11px] text-slate-400 italic">Loading notes...</p>
                        ) : (
                          <>
                            {(notesByCandidate[candidate.id] || []).length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">No notes yet.</p>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {(notesByCandidate[candidate.id] || []).map((note) => (
                                  <div key={note.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                                      <span>{note.interviewer?.full_name || `Interviewer #${note.interviewer_id}`}</span>
                                      <span>{formatDate(note.created_at)}</span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-200 flex items-center gap-1">
                                      <Star size={11} className="text-amber-300" />
                                      Score {note.score}/5
                                    </p>
                                    <p className="text-[11px] text-slate-300 mt-1 whitespace-pre-wrap">{note.comments}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {canManage && (
                              <div className="pt-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={(noteFormByCandidate[candidate.id] || INITIAL_NOTE_FORM).score}
                                    onChange={(e) => updateNoteForm(candidate.id, { score: Number(e.target.value) })}
                                    className="app-input rounded-lg px-2 py-1 text-[11px] w-20"
                                  >
                                    {[1, 2, 3, 4, 5].map((score) => (
                                      <option key={score} value={score}>
                                        {score}/5
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => void handleAddNote(candidate.id)}
                                    disabled={noteSubmittingByCandidate[candidate.id]}
                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={12} />
                                    {noteSubmittingByCandidate[candidate.id] ? "Saving..." : "Save Note"}
                                  </button>
                                </div>
                                <textarea
                                  value={(noteFormByCandidate[candidate.id] || INITIAL_NOTE_FORM).comments}
                                  onChange={(e) => updateNoteForm(candidate.id, { comments: e.target.value })}
                                  placeholder="Interview feedback, strengths, concerns..."
                                  className="w-full app-input rounded-lg px-2.5 py-2 text-[11px] min-h-[64px] resize-none"
                                />
                                {notesErrorByCandidate[candidate.id] && (
                                  <p className="text-[11px] text-red-400">{notesErrorByCandidate[candidate.id]}</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
