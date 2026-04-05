"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BonusPenaltyService, PayrollService, SalaryUpdatePayload, UserService, CreateBonusPenaltyPayload, UserProfile as UserProfileService } from "@/services/hr.service";
import { Payslip, BonusPenalty, BonusPenaltyType } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { UserProfile } from "@/types/auth";

const TJ_EXPORT_LOCALE = "ru-RU";
export const UI_TIME_ZONE = "Asia/Dushanbe";
export const STANDARD_CURRENCY = "TJS";
export const TJ_REFERENCE_TAX_RATE = 0.12;

export type FlashMessage = { type: "success" | "error"; text: string } | null;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return typeof response?.data?.error === "string" ? response.data.error : fallback;
};

const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadCsv = (fileName: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export const usePayroll = () => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [message, setMessage] = useState<FlashMessage>(null);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [salaryForm, setSalaryForm] = useState<SalaryUpdatePayload>({
    user_id: 0,
    base_salary: 0,
    currency: STANDARD_CURRENCY,
    bank_name: "",
    account_number: "",
    tax_id: "",
    reason: "",
  });

  // Bonus modal
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusPenalties, setBonusPenalties] = useState<BonusPenalty[]>([]);
  const [bonusLoading, setBonusLoading] = useState(false);
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [bonusForm, setBonusForm] = useState<CreateBonusPenaltyPayload>({
    user_id: 0,
    type: "BONUS",
    amount: 0,
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });

  // PDF
  const [pdfLoading, setPdfLoading] = useState(false);

  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";
  const uiLocale = locale === "tj" ? "tg-TJ" : "ru-RU";

  // ── Formatters ────────────────────────────────────────────────
  const formatDate = useCallback(
    (value: string | Date, dateLocale = uiLocale) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat(dateLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: UI_TIME_ZONE,
      }).format(date);
    },
    [uiLocale]
  );

  const formatCurrency = useCallback(
    (value: number, currency = STANDARD_CURRENCY, dateLocale = uiLocale) =>
      new Intl.NumberFormat(dateLocale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number.isFinite(value) ? value : 0),
    [uiLocale]
  );

  const formatNumber = useCallback(
    (value: number, dateLocale = uiLocale) =>
      new Intl.NumberFormat(dateLocale, {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      }).format(Number.isFinite(value) ? value : 0),
    [uiLocale]
  );

  const getMonthName = useCallback(
    (month: number, dateLocale = uiLocale) =>
      new Intl.DateTimeFormat(dateLocale, { month: "long", timeZone: UI_TIME_ZONE }).format(
        new Date(Date.UTC(2026, month - 1, 1))
      ),
    [uiLocale]
  );

  // ── Data fetching ─────────────────────────────────────────────
  const fetchPayslips = useCallback(async () => {
    try {
      const data = await PayrollService.getMyPayslips();
      setPayslips(data || []);
    } catch (error) {
      console.error("Failed to fetch payslips", error);
      setMessage({ type: "error", text: t("payroll.loadError") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    if (!isAdminOrHR) return;
    setUsersLoading(true);
    try {
      const data = await UserService.getAll();
      setUsers((data || []) as UserProfile[]);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdminOrHR]);

  const fetchBonusPenalties = useCallback(async () => {
    if (!isAdminOrHR) return;
    setBonusLoading(true);
    try {
      const data = await BonusPenaltyService.getAll();
      setBonusPenalties(data || []);
    } catch (error) {
      console.error("Failed to fetch bonuses", error);
    } finally {
      setBonusLoading(false);
    }
  }, [isAdminOrHR]);

  useEffect(() => {
    void fetchPayslips();
    if (isAdminOrHR) {
      void fetchBonusPenalties();
    }
  }, [fetchPayslips, fetchBonusPenalties, isAdminOrHR]);

  // ── Actions ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerateLoading(true);
    setMessage(null);
    const now = new Date();
    try {
      await PayrollService.generateMonthly(now.getMonth() + 1, now.getFullYear());
      setMessage({ type: "success", text: t("payroll.generateSuccess") });
      await fetchPayslips();
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, t("payroll.generateError")) });
    } finally {
      setGenerateLoading(false);
    }
  };

  const openSettingsModal = async () => {
    setMessage(null);
    setShowSettingsModal(true);
    if (users.length === 0) {
      await fetchUsers();
    }
  };

  const handleApplySalary = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (!salaryForm.user_id || salaryForm.base_salary <= 0) {
      setMessage({ type: "error", text: t("payroll.fillRequired") });
      return;
    }
    setSalarySubmitting(true);
    try {
      await PayrollService.updateSalary({
        ...salaryForm,
        currency: (salaryForm.currency || STANDARD_CURRENCY).trim().toUpperCase(),
      });
      setMessage({ type: "success", text: t("payroll.salaryApplied") });
      setShowSettingsModal(false);
      setSalaryForm({
        user_id: 0,
        base_salary: 0,
        currency: STANDARD_CURRENCY,
        bank_name: "",
        account_number: "",
        tax_id: "",
        reason: "",
      });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, t("payroll.salaryApplyError")) });
    } finally {
      setSalarySubmitting(false);
    }
  };

  const handleBonusSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bonusForm.user_id || bonusForm.amount <= 0) return;
    setBonusSubmitting(true);
    try {
      await BonusPenaltyService.create(bonusForm);
      setMessage({ type: "success", text: t("payroll.bonusSuccess") || "Bonus/Penalty added successfully" });
      setShowBonusModal(false);
      await fetchBonusPenalties();
      setBonusForm({
        user_id: 0,
        type: "BONUS",
        amount: 0,
        reason: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "Failed to add bonus/penalty") });
    } finally {
      setBonusSubmitting(false);
    }
  };

  const handleDeleteBonus = async (id: number) => {
    if (!window.confirm(t("payroll.confirmDeleteBonus") || "Are you sure?")) return;
    try {
      await BonusPenaltyService.delete(id);
      setBonusPenalties((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete bonus", error);
    }
  };

  // ── Computed analytics ────────────────────────────────────────
  const currentYear = useMemo(
    () => Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: UI_TIME_ZONE }).format(new Date())),
    []
  );

  const payslipsCurrentYear = useMemo(() => payslips.filter((slip) => slip.year === currentYear), [currentYear, payslips]);

  const totalNetCurrentYear = useMemo(
    () => payslipsCurrentYear.reduce((sum, slip) => sum + (slip.net_amount || 0), 0),
    [payslipsCurrentYear]
  );

  const paidCount = useMemo(() => payslips.filter((slip) => slip.status === "PAID").length, [payslips]);
  const pendingCount = useMemo(() => payslips.filter((slip) => slip.status === "PENDING").length, [payslips]);
  const cancelledCount = useMemo(() => payslips.filter((slip) => slip.status === "CANCELLED").length, [payslips]);

  const referenceTaxCurrentYear = useMemo(() => totalNetCurrentYear * TJ_REFERENCE_TAX_RATE, [totalNetCurrentYear]);

  const avgNetCurrentYear = useMemo(
    () => (payslipsCurrentYear.length ? totalNetCurrentYear / payslipsCurrentYear.length : 0),
    [payslipsCurrentYear.length, totalNetCurrentYear]
  );

  const byStatus = useMemo(
    () => [
      {
        status: "PAID",
        label: t("payroll.status.paid"),
        count: paidCount,
        amount: payslips.filter((slip) => slip.status === "PAID").reduce((sum, slip) => sum + (slip.net_amount || 0), 0),
      },
      {
        status: "PENDING",
        label: t("payroll.status.pending"),
        count: pendingCount,
        amount: payslips.filter((slip) => slip.status === "PENDING").reduce((sum, slip) => sum + (slip.net_amount || 0), 0),
      },
      {
        status: "CANCELLED",
        label: t("payroll.status.cancelled"),
        count: cancelledCount,
        amount: payslips.filter((slip) => slip.status === "CANCELLED").reduce((sum, slip) => sum + (slip.net_amount || 0), 0),
      },
    ],
    [cancelledCount, paidCount, payslips, pendingCount, t]
  );

  const monthlyTotals = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      monthLabel: getMonthName(index + 1),
      count: 0,
      amount: 0,
    }));
    payslipsCurrentYear.forEach((slip) => {
      const index = slip.month - 1;
      if (index < 0 || index > 11) return;
      months[index].count += 1;
      months[index].amount += slip.net_amount || 0;
    });
    return months;
  }, [getMonthName, payslipsCurrentYear]);

  // ── Export helpers ────────────────────────────────────────────
  const exportAnalyticsCsv = () => {
    const rows: Array<Array<string | number>> = [
      [t("payroll.analytics.standard"), t("payroll.analytics.standardValue")],
      [t("payroll.analytics.locale"), TJ_EXPORT_LOCALE],
      [t("payroll.analytics.timezone"), UI_TIME_ZONE],
      [t("payroll.analytics.currency"), STANDARD_CURRENCY],
      [t("payroll.analytics.generatedAt"), formatDate(new Date(), TJ_EXPORT_LOCALE)],
      [t("payroll.analytics.year"), currentYear],
      [],
      [t("payroll.analytics.kpi"), t("payroll.analytics.value")],
      [t("payroll.analytics.totalRecords"), payslips.length],
      [t("payroll.analytics.paidCount"), paidCount],
      [t("payroll.analytics.pendingCount"), pendingCount],
      [t("payroll.analytics.cancelledCount"), cancelledCount],
      [t("payroll.analytics.netYear"), formatCurrency(totalNetCurrentYear, STANDARD_CURRENCY, TJ_EXPORT_LOCALE)],
      [
        `${t("payroll.analytics.referenceTax")} (${formatNumber(TJ_REFERENCE_TAX_RATE * 100, TJ_EXPORT_LOCALE)}%)`,
        formatCurrency(referenceTaxCurrentYear, STANDARD_CURRENCY, TJ_EXPORT_LOCALE),
      ],
      [t("payroll.analytics.avgNet"), formatCurrency(avgNetCurrentYear, STANDARD_CURRENCY, TJ_EXPORT_LOCALE)],
      [],
      [t("payroll.analytics.status"), t("payroll.analytics.count"), t("payroll.analytics.amount")],
      ...byStatus.map((row) => [row.label, row.count, formatCurrency(row.amount, STANDARD_CURRENCY, TJ_EXPORT_LOCALE)]),
      [],
      [t("payroll.analytics.month"), t("payroll.analytics.count"), t("payroll.analytics.amount")],
      ...monthlyTotals.map((row) => [row.monthLabel, row.count, formatCurrency(row.amount, STANDARD_CURRENCY, TJ_EXPORT_LOCALE)]),
    ];
    downloadCsv(`payroll-analytics-tj-${Date.now()}.csv`, rows);
  };

  const exportHistoryCsv = () => {
    const rows: Array<Array<string | number>> = [
      ["ID", t("payroll.period"), t("payroll.netAmount"), t("payroll.status"), t("payroll.generatedAt")],
      ...payslips.map((slip) => [
        slip.id,
        `${getMonthName(slip.month, TJ_EXPORT_LOCALE)} ${slip.year}`,
        formatCurrency(slip.net_amount || 0, STANDARD_CURRENCY, TJ_EXPORT_LOCALE),
        t(`payroll.status.${String(slip.status).toLowerCase()}`),
        formatDate(slip.generated_at, TJ_EXPORT_LOCALE),
      ]),
    ];
    downloadCsv(`payroll-history-tj-${Date.now()}.csv`, rows);
  };

  const exportPayslipsPdf = () => {
    if (payslips.length === 0) return;
    setPdfLoading(true);
    try {
      const statusColor = (s: string) => {
        if (s === "PAID") return "#10b981";
        if (s === "PENDING") return "#f59e0b";
        return "#ef4444";
      };

      const rows = payslips
        .map(
          (slip) => `
          <tr>
            <td>${slip.id}</td>
            <td>${getMonthName(slip.month, uiLocale)} ${slip.year}</td>
            <td class="amount">${formatCurrency(slip.net_amount || 0)}</td>
            <td style="color:${statusColor(String(slip.status))}; font-weight:600">
              ${t(`payroll.status.${String(slip.status).toLowerCase()}`)}
            </td>
            <td>${formatDate(slip.generated_at)}</td>
          </tr>`
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <title>${t("payroll.title")} — HRMS Core</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:'Inter','Segoe UI',sans-serif;font-size:13px;color:#0f172a;background:#fff;padding:0}
            .header{background:#4f46e5;color:#fff;padding:24px 36px;display:flex;justify-content:space-between;align-items:flex-end}
            .header-brand{font-size:22px;font-weight:700;letter-spacing:-.5px}
            .header-sub{font-size:11px;opacity:.75;margin-top:4px}
            .header-date{font-size:11px;opacity:.75;text-align:right}
            .body{padding:28px 36px}
            .info-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0}
            .employee-name{font-size:16px;font-weight:700;margin-bottom:4px}
            .employee-meta{font-size:11px;color:#64748b;line-height:1.8}
            .year-block{text-align:right}
            .year-label{font-size:11px;color:#64748b;margin-bottom:4px}
            .year-total{font-size:20px;font-weight:700;color:#4f46e5}
            .year-ytd{font-size:11px;color:#64748b;margin-top:2px}
            table{width:100%;border-collapse:collapse;margin-top:8px}
            thead tr{background:#4f46e5;color:#fff}
            thead th{padding:10px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
            tbody tr{border-bottom:1px solid #f1f5f9}
            tbody tr:nth-child(even){background:#f8fafc}
            tbody tr:hover{background:#f1f5f9}
            td{padding:10px 14px;font-size:12.5px}
            .amount{font-weight:600;color:#4f46e5}
            .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}
            .stat-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px}
            .stat-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
            .stat-value{font-size:17px;font-weight:700}
            .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8}
            @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.header{background:#4f46e5!important}thead tr{background:#4f46e5!important}}
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="header-brand">HRMS Core</div><div class="header-sub">${t("payroll.title")}</div></div>
            <div class="header-date">${t("payroll.analytics.generatedAt") || "Сформировано"}: ${formatDate(new Date())}</div>
          </div>
          <div class="body">
            <div class="info-row">
              <div>
                <div class="employee-name">${user?.full_name ?? "—"}</div>
                <div class="employee-meta">${user?.email ?? ""}<br/>${user?.role ?? ""}</div>
              </div>
              <div class="year-block">
                <div class="year-label">${t("payroll.analytics.year") || "Год"}: ${currentYear}</div>
                <div class="year-total">${formatCurrency(totalNetCurrentYear)}</div>
                <div class="year-ytd">${t("payroll.ytd") || "Итого за год"}</div>
              </div>
            </div>
            <div class="stats-row">
              <div class="stat-box"><div class="stat-label">${t("payroll.analytics.paidCount") || "Оплачено"}</div><div class="stat-value" style="color:#10b981">${paidCount}</div></div>
              <div class="stat-box"><div class="stat-label">${t("payroll.analytics.pendingCount") || "Ожидает"}</div><div class="stat-value" style="color:#f59e0b">${pendingCount}</div></div>
              <div class="stat-box"><div class="stat-label">${t("payroll.analytics.totalRecords") || "Всего"}</div><div class="stat-value">${payslips.length}</div></div>
            </div>
            <table>
              <thead><tr><th>#</th><th>${t("payroll.period") || "Период"}</th><th>${t("payroll.netAmount") || "Сумма"}</th><th>${t("payroll.status") || "Статус"}</th><th>${t("payroll.generatedAt") || "Дата"}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">HRMS Core &bull; ${t("payroll.title")} &bull; ${user?.full_name ?? ""} &bull; ${currentYear}</div>
          </div>
        </body>
        </html>`;

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        setMessage({ type: "error", text: "Разрешите открытие всплывающих окон в браузере." });
        return;
      }
      win.document.write(html);
      win.document.close();
      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
        }, 600);
      };
      setTimeout(() => {
        if (win && !win.closed) {
          win.focus();
          win.print();
        }
      }, 1200);
    } catch (err) {
      console.error("PDF export failed", err);
      setMessage({ type: "error", text: "Экспорт не удался. Попробуйте ещё раз." });
    } finally {
      setPdfLoading(false);
    }
  };

  return {
    // i18n
    t,
    locale,

    // State
    payslips,
    loading,
    generateLoading,
    message,
    setMessage,
    isAdminOrHR,
    uiLocale,
    user,

    // Settings
    showSettingsModal,
    setShowSettingsModal,
    users,
    usersLoading,
    salarySubmitting,
    salaryForm,
    setSalaryForm,
    openSettingsModal,
    handleApplySalary,

    // Bonus
    showBonusModal,
    setShowBonusModal,
    bonusPenalties,
    bonusLoading,
    bonusSubmitting,
    setBonusSubmitting,
    bonusForm,
    setBonusForm,
    handleBonusSubmit,
    handleDeleteBonus,

    // PDF
    pdfLoading,

    // Formatters
    formatDate,
    formatCurrency,
    formatNumber,
    getMonthName,

    // Actions
    handleGenerate,
    exportAnalyticsCsv,
    exportHistoryCsv,
    exportPayslipsPdf,
    fetchUsers,

    // Analytics
    currentYear,
    payslipsCurrentYear,
    totalNetCurrentYear,
    paidCount,
    pendingCount,
    cancelledCount,
    referenceTaxCurrentYear,
    avgNetCurrentYear,
    byStatus,
    monthlyTotals,
  };
};
