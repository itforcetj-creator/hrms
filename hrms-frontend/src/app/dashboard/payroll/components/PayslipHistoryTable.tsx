"use client";

import React from "react";
import { Loader2, Wallet } from "lucide-react";
import { Payslip } from "@/types/hr";
import { StatusBadge } from "./StatusBadge";

interface PayslipHistoryTableProps {
  t: (key: string, data?: Record<string, string | number>) => string;
  payslips: Payslip[];
  loading: boolean;
  getMonthName: (month: number) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value: string) => string;
}

export const PayslipHistoryTable: React.FC<PayslipHistoryTableProps> = ({
  t,
  payslips,
  loading,
  getMonthName,
  formatCurrency,
  formatDate,
}) => (
  <div className="space-y-3">
    <h3 className="text-xl font-semibold flex items-center gap-2">
      <Wallet size={20} className="text-indigo-500" />
      {t("payroll.history")}
    </h3>
    <div className="app-surface rounded-2xl overflow-x-auto">
      <table className="w-full min-w-[800px] text-left">
        <thead>
          <tr className="bg-(--surface-hover) text-xs uppercase tracking-wider app-muted">
            <th className="px-6 py-4 font-semibold">{t("payroll.period")}</th>
            <th className="px-6 py-4 font-semibold">{t("payroll.netAmount")}</th>
            <th className="px-6 py-4 font-semibold">{t("payroll.bonus") || "Bonus"}</th>
            <th className="px-6 py-4 font-semibold">{t("payroll.penalty") || "Penalty"}</th>
            <th className="px-6 py-4 font-semibold">{t("payroll.status")}</th>
            <th className="px-6 py-4 font-semibold">{t("payroll.generatedAt")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center app-muted">
                <Loader2 className="animate-spin mx-auto mb-2" />
                {t("payroll.loading")}
              </td>
            </tr>
          ) : payslips.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center app-muted italic">
                {t("payroll.noPayslips")}
              </td>
            </tr>
          ) : (
            payslips.map((slip) => (
              <tr key={slip.id} className="hover:bg-(--surface-hover) transition-colors">
                <td className="px-6 py-4 text-sm">
                  <span className="font-semibold capitalize">{getMonthName(slip.month)}</span> {slip.year}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-indigo-500">
                  {formatCurrency(slip.net_amount || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-emerald-500">
                  +{formatCurrency(slip.bonus_amount || 0)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-rose-500">
                  -{formatCurrency(slip.penalty_amount || 0)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={slip.status} label={t(`payroll.status.${String(slip.status).toLowerCase()}`)} />
                </td>
                <td className="px-6 py-4 text-sm app-muted">{formatDate(slip.generated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);
