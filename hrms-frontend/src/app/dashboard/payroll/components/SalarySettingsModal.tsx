"use client";

import React from "react";
import { X } from "lucide-react";
import { SalaryUpdatePayload } from "@/services/hr.service";
import { UserProfile } from "@/types/auth";

const STANDARD_CURRENCY = "TJS";

interface SalarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, data?: Record<string, string | number>) => string;
  users: UserProfile[];
  usersLoading: boolean;
  salarySubmitting: boolean;
  salaryForm: SalaryUpdatePayload;
  setSalaryForm: React.Dispatch<React.SetStateAction<SalaryUpdatePayload>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const SalarySettingsModal: React.FC<SalarySettingsModalProps> = ({
  isOpen,
  onClose,
  t,
  users,
  usersLoading,
  salarySubmitting,
  salaryForm,
  setSalaryForm,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="app-surface-strong rounded-2xl p-6 w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{t("payroll.manageSalary")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-(--surface-hover) transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.employee")}</label>
            <select
              value={salaryForm.user_id || ""}
              onChange={(event) =>
                setSalaryForm((prev) => ({
                  ...prev,
                  user_id: Number(event.target.value) || 0,
                }))
              }
              className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
              required
            >
              <option value="">{t("payroll.selectEmployee")}</option>
              {users.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.full_name} ({candidate.email})
                </option>
              ))}
            </select>
            {usersLoading && <p className="text-xs app-muted mt-1">{t("payroll.loadingUsers")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.baseSalary")}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salaryForm.base_salary || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    base_salary: Number(event.target.value) || 0,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.currency")}</label>
              <input
                value={salaryForm.currency || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    currency: event.target.value,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                placeholder={STANDARD_CURRENCY}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.bankName")}</label>
              <input
                value={salaryForm.bank_name || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    bank_name: event.target.value,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.accountNumber")}</label>
              <input
                value={salaryForm.account_number || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    account_number: event.target.value,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.taxId")}</label>
              <input
                value={salaryForm.tax_id || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    tax_id: event.target.value,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.reason")}</label>
              <input
                value={salaryForm.reason || ""}
                onChange={(event) =>
                  setSalaryForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-(--border) hover:bg-(--surface-hover) transition-colors"
            >
              {t("payroll.cancel")}
            </button>
            <button
              type="submit"
              disabled={salarySubmitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salarySubmitting ? t("payroll.applying") : t("payroll.apply")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
