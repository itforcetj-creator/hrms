"use client";

import React from "react";
import { RecruitmentJob } from "@/types/hr";

interface DeleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: RecruitmentJob | null;
  isDeleting: boolean;
  error: string;
  onDelete: () => void;
}

export const DeleteJobModal: React.FC<DeleteJobModalProps> = ({ isOpen, onClose, job, isDeleting, error, onDelete }) => {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="app-surface-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Delete Job Opening</h2>
        <p className="app-muted text-sm mb-4">
          This will remove <span className="font-semibold text-[var(--foreground)]">{job.title}</span> and its associated candidates/interview notes.
        </p>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
