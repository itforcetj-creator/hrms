"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, UserCheck, Calendar, Eye, Pencil, Trash2, Building2 } from "lucide-react";
import { JobOpeningStatus, RecruitmentJob } from "@/types/hr";

const statusBadgeClass = (status: JobOpeningStatus) =>
  status === "OPEN"
    ? "bg-emerald-500/10 text-emerald-500"
    : status === "ON_HOLD"
      ? "bg-amber-500/10 text-amber-500"
      : "bg-red-500/10 text-red-500";

interface JobCardProps {
  job: RecruitmentJob;
  idx: number;
  canManage: boolean;
  formatDate: (value?: string) => string;
  onViewDetails: (job: RecruitmentJob) => void;
  onEdit: (job: RecruitmentJob) => void;
  onDelete: (job: RecruitmentJob) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, idx, canManage, formatDate, onViewDetails, onEdit, onDelete }) => {
  return (
    <motion.div
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
          onClick={() => onViewDetails(job)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Eye size={14} />
          Details
        </button>
        <Link
          href={`/dashboard/recruitment/${job.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-colors"
        >
          <Briefcase size={14} />
          Pipeline
        </Link>
        {canManage && (
          <>
            <button
              onClick={() => onEdit(job)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(job)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
