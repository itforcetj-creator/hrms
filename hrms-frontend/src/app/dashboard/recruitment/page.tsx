"use client";

import React from "react";
import { Plus, Search, Briefcase } from "lucide-react";
import { JobOpeningStatus } from "@/types/hr";
import { useRecruitment } from "./hooks/useRecruitment";
import { JobCard } from "./components/JobCard";
import { CreateJobModal } from "./components/CreateJobModal";
import { EditJobModal } from "./components/EditJobModal";
import { DeleteJobModal } from "./components/DeleteJobModal";
import JobDetailsModal  from "./components/JobDetailsModal";

const JOB_STATUS_OPTIONS: JobOpeningStatus[] = ["OPEN", "ON_HOLD", "CLOSED"];

const formatDate = (value?: string) => {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const RecruitmentPage = () => {
  const {
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredJobs,
    canManage,

    // Create
    showCreateModal,
    setShowCreateModal,
    isSubmitting,
    createError,
    createForm,
    setCreateForm,
    openCreateModal,
    handleCreateJob,

    // Edit
    showEditModal,
    isUpdating,
    updateError,
    editTarget,
    editForm,
    setEditForm,
    openEditModal,
    handleUpdateJob,

    // Delete
    showDeleteModal,
    isDeleting,
    deleteError,
    deleteTarget,
    openDeleteModal,
    handleDeleteJob,

    // Details
    showDetailsModal,
    detailsLoading,
    detailsError,
    jobDetails,
    candidateActionId,
    openDetailsModal,
    handleCandidateStatusChange,
    handleHireCandidate,
    setShowDeleteModal,
    setShowDetailsModal,
    setShowEditModal,

    // Interview Notes
    interviewNotes,
    notesLoading,
    fetchInterviewNotes,
    handleAddInterviewNote,

    // Data
    departments,
  } = useRecruitment();

  return (
    <div className="p-10">
      {/* ... (existing job cards and modals) */}

      {/* Job Details Modal */}
      {showDetailsModal && jobDetails && (
        <JobDetailsModal
          job={jobDetails.job}
          onClose={() => setShowDetailsModal(false)}
          canManage={canManage}
          candidateActionId={candidateActionId}
          onHireCandidate={handleHireCandidate}
          interviewNotes={interviewNotes}
          notesLoading={notesLoading}
          onAddNote={handleAddInterviewNote}
        />
      )}
    </div>
  );
};

export default RecruitmentPage;
