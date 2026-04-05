"use client";

import React from "react";
import { CreateRecruitmentJobPayload, DepartmentSummary, JobOpeningStatus } from "@/types/hr";

interface JobFormFieldsProps {
  form: CreateRecruitmentJobPayload;
  setForm: React.Dispatch<React.SetStateAction<CreateRecruitmentJobPayload>>;
  departments: DepartmentSummary[];
  statusOptions: JobOpeningStatus[];
}

export const JobFormFields: React.FC<JobFormFieldsProps> = ({ form, setForm, departments, statusOptions }) => {
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
};
