"use client";

import React from "react";
import { Loader2, X, Trash2 } from "lucide-react";
import { BonusPenalty, BonusPenaltyType } from "@/types/hr";
import { CreateBonusPenaltyPayload } from "@/services/hr.service";
import { UserProfile } from "@/types/auth";




interface BonusPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string, data?: Record<string, string | number>) => string;
  users: UserProfile[];
  bonusPenalties: BonusPenalty[];
  bonusLoading: boolean;
  bonusSubmitting: boolean;
  bonusForm: CreateBonusPenaltyPayload;
  setBonusForm: React.Dispatch<React.SetStateAction<CreateBonusPenaltyPayload>>;
  formatCurrency: (value: number) => string;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: number) => void;
}

export const BonusPenaltyModal: React.FC<BonusPenaltyModalProps> = ({
  isOpen,
  onClose,
  t,
  users,
  bonusPenalties,
  bonusLoading,
  bonusSubmitting,
  bonusForm,
  setBonusForm,
  formatCurrency,
  onSubmit,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="app-surface-strong rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col lg:flex-row gap-8">
        {/* Form side */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("payroll.manageBonus") || "Bonus/Penalty"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 lg:hidden inline-flex items-center justify-center rounded-lg hover:bg-(--surface-hover) transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.employee")}</label>
              <select
                value={bonusForm.user_id || ""}
                onChange={(e) => setBonusForm((prev) => ({ ...prev, user_id: Number(e.target.value) }))}
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                required
              >
                <option value="">{t("payroll.selectEmployee")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.type") || "Type"}</label>
                <select
                  value={bonusForm.type}
                  onChange={(e) => setBonusForm((prev) => ({ ...prev, type: e.target.value as BonusPenaltyType }))}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="BONUS">BONUS</option>
                  <option value="PENALTY">PENALTY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.amount") || "Amount"}</label>
                <input
                  type="number"
                  step="0.01"
                  value={bonusForm.amount || ""}
                  onChange={(e) => setBonusForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.date") || "Date"}</label>
              <input
                type="date"
                value={bonusForm.date}
                onChange={(e) => setBonusForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.reason")}</label>
              <textarea
                value={bonusForm.reason}
                onChange={(e) => setBonusForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={bonusSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50"
            >
              {bonusSubmitting ? <Loader2 className="animate-spin mx-auto" /> : t("payroll.add") || "Add Entry"}
            </button>
          </form>
        </div>

        {/* Table side */}
        <div className="flex-[1.5] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t("payroll.recentHistory") || "Recent History"}</h3>
            <button
              type="button"
              onClick={onClose}
              className="hidden lg:inline-flex w-8 h-8 items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-x-auto border border-(--border) rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--surface-hover)">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("payroll.employee")}</th>
                  <th className="px-4 py-3 font-semibold">{t("payroll.type")}</th>
                  <th className="px-4 py-3 font-semibold">{t("payroll.amount")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("payroll.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {bonusLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center italic app-muted">
                      Loading...
                    </td>
                  </tr>
                ) : bonusPenalties.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center italic app-muted">
                      No records found
                    </td>
                  </tr>
                ) : (
                  bonusPenalties.slice(0, 10).map((b) => (
                    <tr key={b.id} className="hover:bg-(--surface-hover)/50">
                      <td className="px-4 py-3 font-medium">{b.user_id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.type === "BONUS" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {b.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(b.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onDelete(b.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
