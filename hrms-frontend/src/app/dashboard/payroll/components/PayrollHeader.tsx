"use client";

import React from "react";
import { Download, FileText, Loader2, Plus, Settings } from "lucide-react";

interface PayrollHeaderProps {
  t: (key: string, data?: Record<string, string | number>) => string;
  isAdminOrHR: boolean;
  pdfLoading: boolean;
  generateLoading: boolean;
  payslipsCount: number;
  usersCount: number;
  onExportAnalytics: () => void;
  onExportHistory: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onGenerate: () => void;
  onOpenSettings: () => void;
  onOpenBonus: () => void;
  onFetchUsers: () => void;
}

export const PayrollHeader: React.FC<PayrollHeaderProps> = ({
  t,
  isAdminOrHR,
  pdfLoading,
  generateLoading,
  payslipsCount,
  usersCount,
  onExportAnalytics,
  onExportHistory,
  onExportPdf,
  onGenerate,
  onOpenSettings,
  onOpenBonus,
  onFetchUsers,
}) => (
  <header className="flex items-center justify-between gap-4 flex-wrap">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{t("payroll.title")}</h1>
      <p className="app-muted mt-2">{t("payroll.subtitleAnalytics")}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onExportAnalytics}
        className="flex items-center gap-2 px-4 py-2.5 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-semibold text-sm transition-all"
      >
        <Download size={16} />
        {t("payroll.exportAnalytics")}
      </button>
      <button
        onClick={onExportHistory}
        className="flex items-center gap-2 px-4 py-2.5 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-semibold text-sm transition-all"
      >
        <Download size={16} />
        {t("payroll.exportHistory")}
      </button>
      <button
        onClick={onExportExcel}
        className="flex items-center gap-2 px-4 py-2.5 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-semibold text-sm transition-all text-emerald-500"
      >
        <FileText size={16} />
        Excel
      </button>
      <button
        onClick={onExportPdf}
        disabled={pdfLoading || payslipsCount === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-sm shadow-md shadow-rose-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        PDF
      </button>
      {isAdminOrHR && (
        <>
          <button
            onClick={onGenerate}
            disabled={generateLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {generateLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            {t("payroll.generateMonthly")}
          </button>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-5 py-2.5 app-surface-strong hover:bg-(--surface-hover) rounded-xl font-semibold transition-all"
          >
            <Settings size={18} />
            {t("payroll.manageSalary")}
          </button>
          <button
            onClick={() => {
              onOpenBonus();
              if (usersCount === 0) void onFetchUsers();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 rounded-xl font-semibold transition-all"
          >
            <Plus size={18} />
            {t("payroll.manageBonus") || "Bonus/Penalty"}
          </button>
        </>
      )}
    </div>
  </header>
);
