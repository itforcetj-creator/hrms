"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  UserCheck,
  Search,
  Plus,
  Calendar,
  X,
  Building2,
  Eye,
  Pencil,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import {
  CandidateStatus,
  CreateRecruitmentJobPayload,
  DepartmentSummary,
  JobOpeningStatus,
  RecruitmentCandidate,
  RecruitmentJob,
  RecruitmentJobDetailsResponse,
} from "@/types/hr";
import { RecruitmentService } from "@/services/recruitment.service";
import { useAuth } from "@/context/AuthContext";

const JOB_STATUS_OPTIONS: JobOpeningStatus[] = ["OPEN", "ON_HOLD", "CLOSED"];
const CANDIDATE_STATUS_OPTIONS: CandidateStatus[] = ["APPLIED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

const INITIAL_FORM: CreateRecruitmentJobPayload = {
  title: "",
  description: "",
  department_id: 0,
  status: "OPEN",
};

const statusBadgeClass = (status: JobOpeningStatus) =>
  status === "OPEN"
    ? "bg-emerald-500/10 text-emerald-500"
    : status === "ON_HOLD"
      ? "bg-amber-500/10 text-amber-500"
      : "bg-red-500/10 text-red-500";

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

const RecruitmentPage = () => {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "DIRECTOR";

  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobOpeningStatus>("ALL");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<CreateRecruitmentJobPayload>(INITIAL_FORM);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RecruitmentJob | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [editForm, setEditForm] = useState<CreateRecruitmentJobPayload>(INITIAL_FORM);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecruitmentJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [jobDetails, setJobDetails] = useState<RecruitmentJobDetailsResponse | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<number | null>(null);

  const fetchRecruitmentData = async () => {
    try {
      const [jobsData, departmentsData] = await Promise.all([
        RecruitmentService.getJobs(),
        RecruitmentService.getDepartments(),
      ]);
      setJobs(jobsData || []);
      setDepartments(departmentsData || []);
      if (departmentsData.length > 0) {
        setCreateForm((prev) => (prev.department_id ? prev : { ...prev, department_id: departmentsData[0].id }));
      }
    } catch (error) {
      console.error("Failed to fetch recruitment data", error);
      setJobs([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title.toLowerCase().includes(term) ||
        job.department?.name?.toLowerCase().includes(term) ||
        job.description?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const resetCreateForm = () => {
    setCreateForm({
      ...INITIAL_FORM,
      department_id: departments[0]?.id || 0,
    });
    setCreateError("");
  };

  const formatDate = (value?: string) => {
    if (!value) return "Recently";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Recently";
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const applyUpdatedJobToList = (updatedJob: RecruitmentJob) => {
    setJobs((prev) => prev.map((job) => (job.id === updatedJob.id ? { ...job, ...updatedJob } : job)));
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    const title = createForm.title.trim();
    if (!title) {
      setCreateError("Job title is required.");
      return;
    }
    if (!createForm.department_id) {
      setCreateError("Please select a department.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await RecruitmentService.createJob({
        title,
        description: createForm.description.trim(),
        department_id: createForm.department_id,
        status: createForm.status || "OPEN",
      });
      setJobs((prev) => [created, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (error: unknown) {
      setCreateError(extractApiError(error, "Could not create job opening."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (job: RecruitmentJob) => {
    setEditTarget(job);
    setEditForm({
      title: job.title,
      description: job.description || "",
      department_id: job.department_id,
      status: job.status,
    });
    setUpdateError("");
    setShowEditModal(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setUpdateError("");

    const title = editForm.title.trim();
    if (!title) {
      setUpdateError("Job title is required.");
      return;
    }
    if (!editForm.department_id) {
      setUpdateError("Please select a department.");
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await RecruitmentService.updateJob(editTarget.id, {
        title,
        description: editForm.description.trim(),
        department_id: editForm.department_id,
        status: editForm.status || "OPEN",
      });
      applyUpdatedJobToList(updated);
      if (jobDetails?.job.id === updated.id) {
        setJobDetails((prev) => (prev ? { ...prev, job: { ...prev.job, ...updated } } : prev));
      }
      setShowEditModal(false);
      setEditTarget(null);
    } catch (error: unknown) {
      setUpdateError(extractApiError(error, "Failed to update job opening."));
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteModal = (job: RecruitmentJob) => {
    setDeleteTarget(job);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleDeleteJob = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await RecruitmentService.deleteJob(deleteTarget.id);
      setJobs((prev) => prev.filter((job) => job.id !== deleteTarget.id));
      if (jobDetails?.job.id === deleteTarget.id) {
        setShowDetailsModal(false);
        setJobDetails(null);
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (error: unknown) {
      setDeleteError(extractApiError(error, "Failed to delete job opening."));
    } finally {
      setIsDeleting(false);
    }
  };

  const openDetailsModal = async (job: RecruitmentJob) => {
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setDetailsError("");
    setJobDetails(null);
    try {
      const details = await RecruitmentService.getJobDetails(job.id);
      setJobDetails(details);
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response?.status === "number"
          ? (error as { response: { status: number } }).response.status
          : undefined;

      // Backward-compatible fallback for servers that don't yet expose /admin/v1/recruitment/jobs/:id
      if (status === 404) {
        try {
          const candidates = await RecruitmentService.getCandidatesByJob(job.id);
          setJobDetails({
            job: {
              ...job,
              applications_count: candidates.length,
            },
            candidates,
          });
          return;
        } catch (fallbackError: unknown) {
          setDetailsError(extractApiError(fallbackError, "Failed to load candidate details."));
          return;
        }
      }

      setDetailsError(extractApiError(error, "Failed to load job details."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateCandidateState = (candidateId: number, updater: (candidate: RecruitmentCandidate) => RecruitmentCandidate) => {
    setJobDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        candidates: prev.candidates.map((candidate) => (candidate.id === candidateId ? updater(candidate) : candidate)),
      };
    });
  };

  const handleCandidateStatusChange = async (candidateId: number, status: CandidateStatus) => {
    setCandidateActionId(candidateId);
    try {
      await RecruitmentService.updateCandidateStatus(candidateId, status);
      updateCandidateState(candidateId, (candidate) => ({ ...candidate, status }));
    } catch (error) {
      setDetailsError(extractApiError(error, "Failed to update candidate status."));
    } finally {
      setCandidateActionId(null);
    }
  };

  const handleHireCandidate = async (candidateId: number) => {
    setCandidateActionId(candidateId);
    try {
      await RecruitmentService.hireCandidate(candidateId);
      updateCandidateState(candidateId, (candidate) => ({ ...candidate, status: "HIRED" }));
    } catch (error) {
      setDetailsError(extractApiError(error, "Failed to hire candidate."));
    } finally {
      setCandidateActionId(null);
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Talent Acquisition</h1>
          <p className="app-muted">Manage job openings and candidate pipelines.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg font-medium"
          >
            <Plus size={18} />
            Post Job
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 app-muted" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="w-full app-input rounded-xl py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | JobOpeningStatus)}
          className="app-input rounded-xl py-2 px-4 text-sm min-w-[160px]"
        >
          <option value="ALL">All Statuses</option>
          {JOB_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center app-muted italic">Loading open positions...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="col-span-full py-20 text-center app-muted italic">No job openings match your filters.</div>
        ) : (
          filteredJobs.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="app-surface backdrop-blur-sm p-6 rounded-3xl hover:border-indigo-500/20 group transition-all relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(job.status)}`}>
                {job.status.replace("_", " ")}
              </div>

              <Briefcase size={32} className="text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold mb-1 group-hover:text-indigo-400 transition-colors">{job.title}</h3>
              <p className="text-xs app-muted mb-4 flex items-center gap-1.5">
                <Building2 size={12} />
                {job.department?.name || `Department #${job.department_id}`}
              </p>
              <p className="text-sm app-muted line-clamp-2 min-h-[40px]">{job.description || "No description provided."}</p>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] mt-5 mb-4">
                <div className="flex items-center gap-2 app-muted">
                  <UserCheck size={16} />
                  <span className="text-xs font-bold">{job.applications_count || 0} Candidates</span>
                </div>
                <div className="flex items-center gap-2 app-muted">
                  <Calendar size={14} />
                  <span className="text-[10px]">{formatDate(job.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDetailsModal(job)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Eye size={14} />
                  Details
                </button>
                {canManage && (
                  <>
                    <button
                      onClick={() => openEditModal(job)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(job)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateJob} className="app-surface-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create Job Opening</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <JobFormFields form={createForm} setForm={setCreateForm} departments={departments} statusOptions={JOB_STATUS_OPTIONS} />
            {createError && <p className="text-sm text-red-500 mt-4">{createError}</p>}

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || departments.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpdateJob} className="app-surface-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Update Job Opening</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <JobFormFields form={editForm} setForm={setEditForm} departments={departments} statusOptions={JOB_STATUS_OPTIONS} />
            {updateError && <p className="text-sm text-red-500 mt-4">{updateError}</p>}

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Updating..." : "Update Job"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-surface-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Delete Job Opening</h2>
            <p className="app-muted text-sm mb-4">
              This will remove <span className="font-semibold text-[var(--foreground)]">{deleteTarget.title}</span> and its associated candidates/interview notes.
            </p>
            {deleteError && <p className="text-sm text-red-500 mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-surface-strong rounded-2xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Job Details</h2>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-14 text-center app-muted italic">Loading detailed job information...</div>
            ) : detailsError ? (
              <div className="py-8 text-center text-red-500">{detailsError}</div>
            ) : !jobDetails ? (
              <div className="py-8 text-center app-muted">No details available.</div>
            ) : (
              <>
                <div className="app-surface rounded-2xl p-5 mb-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-2xl font-bold">{jobDetails.job.title}</h3>
                      <p className="app-muted text-sm mt-1">{jobDetails.job.department?.name || `Department #${jobDetails.job.department_id}`}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusBadgeClass(jobDetails.job.status)}`}>
                      {jobDetails.job.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm app-muted leading-relaxed">
                    {jobDetails.job.description || "No description provided."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs app-muted">
                    <span>Posted: {formatDate(jobDetails.job.created_at)}</span>
                    <span>Candidates: {jobDetails.job.applications_count || jobDetails.candidates.length}</span>
                  </div>
                </div>

                <div className="app-surface rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <h4 className="font-semibold">Candidate Pipeline</h4>
                    <span className="text-xs app-muted">{jobDetails.candidates.length} total</span>
                  </div>

                  {jobDetails.candidates.length === 0 ? (
                    <div className="py-12 text-center app-muted italic">No candidate</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px]">
                        <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
                          <tr className="text-left text-xs uppercase tracking-wider app-muted">
                            <th className="px-4 py-3">Candidate</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Applied</th>
                            {canManage && <th className="px-4 py-3">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {jobDetails.candidates.map((candidate) => (
                            <tr key={candidate.id} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-4 py-3 text-sm font-medium">{candidate.full_name}</td>
                              <td className="px-4 py-3 text-sm app-muted">{candidate.email}</td>
                              <td className="px-4 py-3 text-sm">
                                {canManage ? (
                                  <select
                                    value={candidate.status}
                                    onChange={(e) => handleCandidateStatusChange(candidate.id, e.target.value as CandidateStatus)}
                                    disabled={candidateActionId === candidate.id}
                                    className="app-input rounded-lg px-3 py-1.5 text-xs min-w-[130px]"
                                  >
                                    {CANDIDATE_STATUS_OPTIONS.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="app-muted">{candidate.status}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm app-muted">{formatDate(candidate.applied_at)}</td>
                              {canManage && (
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleHireCandidate(candidate.id)}
                                    disabled={candidate.status === "HIRED" || candidateActionId === candidate.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <UserRoundCheck size={13} />
                                    {candidate.status === "HIRED" ? "Hired" : "Hire"}
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function JobFormFields({
  form,
  setForm,
  departments,
  statusOptions,
}: {
  form: CreateRecruitmentJobPayload;
  setForm: React.Dispatch<React.SetStateAction<CreateRecruitmentJobPayload>>;
  departments: DepartmentSummary[];
  statusOptions: JobOpeningStatus[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium app-muted mb-1.5">Title</label>
        <input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. Senior Go Developer"
          className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium app-muted mb-1.5">Department</label>
        <select
          value={form.department_id}
          onChange={(e) => setForm((prev) => ({ ...prev, department_id: Number(e.target.value) }))}
          className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
          required
        >
          {departments.length === 0 && <option value={0}>No departments found</option>}
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium app-muted mb-1.5">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as JobOpeningStatus }))}
          className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium app-muted mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Role responsibilities, requirements, and details..."
          className="w-full app-input rounded-xl px-4 py-2.5 text-sm min-h-[120px] resize-none"
        />
      </div>
    </div>
  );
}

export default RecruitmentPage;
