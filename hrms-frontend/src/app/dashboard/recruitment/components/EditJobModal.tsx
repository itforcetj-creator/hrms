"use client";

import React from "react";
import { X } from "lucide-react";
import { CreateRecruitmentJobPayload, DepartmentSummary, JobOpeningStatus, RecruitmentJob } from "@/types/hr";
import { JobFormFields } from "./JobFormFields";

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RecruitmentJob | null;
  form: CreateRecruitmentJobPayload;
  setForm: React.Dispatch<React.SetStateAction<CreateRecruitmentJobPayload>>;
  departments: DepartmentSummary[];
  isUpdating: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

const JOB_STATUS_OPTIONS: JobOpeningStatus[] = ["OPEN", "ON_HOLD", "CLOSED"];

export const EditJobModal: React.FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  job,
  form,
  setForm,
  departments,
  isUpdating,
  error,
  onSubmit,
}) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="app-surface-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Update Job Opening</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <JobFormFields form={form} setForm={setForm} departments={departments} statusOptions={JOB_STATUS_OPTIONS} />
        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
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
  );
};
