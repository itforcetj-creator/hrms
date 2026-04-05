"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CandidateStatus,
  CreateRecruitmentJobPayload,
  DepartmentSummary,
  JobOpeningStatus,
  RecruitmentCandidate,
  RecruitmentJob,
  RecruitmentJobDetailsResponse,
  InterviewNote,
} from "@/types/hr";
import { RecruitmentService } from "@/services/recruitment.service";
import { useAuth } from "@/context/AuthContext";

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

export const useRecruitment = () => {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "DIRECTOR";

  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobOpeningStatus>("ALL");

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState<CreateRecruitmentJobPayload>({
    title: "",
    description: "",
    department_id: 0,
    status: "OPEN",
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RecruitmentJob | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [editForm, setEditForm] = useState<CreateRecruitmentJobPayload>({
    title: "",
    description: "",
    department_id: 0,
    status: "OPEN",
  });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecruitmentJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [jobDetails, setJobDetails] = useState<RecruitmentJobDetailsResponse | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<number | null>(null);

  // Interview Notes state
  const [interviewNotes, setInterviewNotes] = useState<Record<number, InterviewNote[]>>({});
  const [notesLoading, setNotesLoading] = useState<Record<number, boolean>>({});

  const fetchRecruitmentData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRecruitmentData();
  }, [fetchRecruitmentData]);

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

  const resetCreateForm = useCallback(() => {
    setCreateForm({
      title: "",
      description: "",
      department_id: departments[0]?.id || 0,
      status: "OPEN",
    });
    setCreateError("");
  }, [departments]);

  const openCreateModal = useCallback(() => {
    resetCreateForm();
    setShowCreateModal(true);
  }, [resetCreateForm]);

  const handleCreateJob = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [createForm, resetCreateForm]
  );

  const openEditModal = useCallback((job: RecruitmentJob) => {
    setEditTarget(job);
    setEditForm({
      title: job.title,
      description: job.description || "",
      department_id: job.department_id,
      status: job.status,
    });
    setUpdateError("");
    setShowEditModal(true);
  }, []);

  const applyUpdatedJobToList = useCallback((updatedJob: RecruitmentJob) => {
    setJobs((prev) => prev.map((job) => (job.id === updatedJob.id ? { ...job, ...updatedJob } : job)));
  }, []);

  const handleUpdateJob = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [editTarget, editForm, applyUpdatedJobToList, jobDetails]
  );

  const openDeleteModal = useCallback((job: RecruitmentJob) => {
    setDeleteTarget(job);
    setDeleteError("");
    setShowDeleteModal(true);
  }, []);

  const handleDeleteJob = useCallback(async () => {
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
  }, [deleteTarget, jobDetails]);

  const openDetailsModal = useCallback(async (job: RecruitmentJob) => {
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

      if (status === 404) {
        try {
          const candidates = await RecruitmentService.getCandidatesByJob(job.id);
          setJobDetails({
            job: { ...job, applications_count: candidates.length },
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
  }, []);

  const updateCandidateState = useCallback((candidateId: number, updater: (candidate: RecruitmentCandidate) => RecruitmentCandidate) => {
    setJobDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        candidates: prev.candidates.map((candidate) => (candidate.id === candidateId ? updater(candidate) : candidate)),
      };
    });
  }, []);

  const handleCandidateStatusChange = useCallback(
    async (candidateId: number, status: CandidateStatus) => {
      setCandidateActionId(candidateId);
      try {
        await RecruitmentService.updateCandidateStatus(candidateId, status);
        updateCandidateState(candidateId, (candidate) => ({ ...candidate, status }));
      } catch (error) {
        setDetailsError(extractApiError(error, "Failed to update candidate status."));
      } finally {
        setCandidateActionId(null);
      }
    },
    [updateCandidateState]
  );

  const handleHireCandidate = useCallback(
    async (candidateId: number) => {
      setCandidateActionId(candidateId);
      try {
        await RecruitmentService.hireCandidate(candidateId);
        updateCandidateState(candidateId, (candidate) => ({ ...candidate, status: "HIRED" }));
      } catch (error) {
        setDetailsError(extractApiError(error, "Failed to hire candidate."));
      } finally {
        setCandidateActionId(null);
      }
    },
    [updateCandidateState]
  );

  const fetchInterviewNotes = useCallback(async (candidateId: number) => {
    setNotesLoading((prev) => ({ ...prev, [candidateId]: true }));
    try {
      const notes = await RecruitmentService.getInterviewNotes(candidateId);
      setInterviewNotes((prev) => ({ ...prev, [candidateId]: notes }));
    } catch (error) {
      console.error("Failed to fetch interview notes", error);
    } finally {
      setNotesLoading((prev) => ({ ...prev, [candidateId]: false }));
    }
  }, []);

  const handleAddInterviewNote = useCallback(async (candidateId: number, score: number, comments: string) => {
    try {
      const result = await RecruitmentService.addInterviewNote(candidateId, { score, comments });
      setInterviewNotes((prev) => ({
        ...prev,
        [candidateId]: [result.note, ...(prev[candidateId] || [])],
      }));
    } catch (error) {
      setDetailsError(extractApiError(error, "Failed to add interview note."));
      throw error;
    }
  }, []);

  return {
    jobs,
    departments,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredJobs,
    canManage,
    showCreateModal,
    setShowCreateModal,
    isSubmitting,
    createError,
    createForm,
    setCreateForm,
    openCreateModal,
    handleCreateJob,
    showEditModal,
    setShowEditModal,
    isUpdating,
    updateError,
    editTarget,
    editForm,
    setEditForm,
    openEditModal,
    handleUpdateJob,
    showDeleteModal,
    setShowDeleteModal,
    isDeleting,
    deleteError,
    deleteTarget,
    openDeleteModal,
    handleDeleteJob,
    showDetailsModal,
    setShowDetailsModal,
    detailsLoading,
    detailsError,
    jobDetails,
    candidateActionId,
    openDetailsModal,
    handleCandidateStatusChange,
    handleHireCandidate,
    interviewNotes,
    notesLoading,
    fetchInterviewNotes,
    handleAddInterviewNote,
  };
};
