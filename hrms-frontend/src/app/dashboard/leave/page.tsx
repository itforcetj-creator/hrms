"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  List,
  Loader2,
  Plus,
  UserRound,
  XCircle,
} from "lucide-react";
import { LeaveService, LeaveRequestPayload } from "@/services/hr.service";
import { LeaveRequest } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const LEAVE_TYPE_VALUES: LeaveRequestPayload["type"][] = ["VACATION", "SICK", "UNPAID", "MATERNITY"];
const approverRoles = new Set(["ADMIN", "HR", "DEPARTMENT_HEAD", "DIRECTOR"]);
const TJ_LOCALE = "tg-TJ";
const TJ_TIME_ZONE = "Asia/Dushanbe";
const TJ_STANDARD_ANNUAL_LEAVE_DAYS = 24;

// Leave type color map
const LEAVE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  VACATION: {
    bg: "bg-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/40",
    dot: "bg-indigo-500",
  },
  SICK: {
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
  },
  UNPAID: {
    bg: "bg-slate-500/15",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/40",
    dot: "bg-slate-500",
  },
  MATERNITY: {
    bg: "bg-pink-500/15",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/40",
    dot: "bg-pink-500",
  },
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }
  const response = (error as { response?: { data?: { error?: string } } }).response;
  return typeof response?.data?.error === "string" ? response.data.error : fallback;
};

const calcDaysFallback = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const msInDay = 1000 * 60 * 60 * 24;
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.max(0, (endUtc - startUtc) / msInDay + 1);
};

const formatDateWithLocale = (value: string | Date | undefined, locale: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TJ_TIME_ZONE,
  }).format(parsed);
};

const formatNumberWithLocale = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);

const escapeCsvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadCsv = (fileName: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// ─── Leave Calendar Component ───────────────────────────────────────────────

interface CalendarLeave {
  id: number;
  name: string;
  type: string;
  status: string;
  start: Date;
  end: Date;
}

const LeaveCalendar = ({
  requests,
  isApprover,
  uiLocale,
  t,
}: {
  requests: (LeaveRequest & { effectiveDays: number })[];
  isApprover: boolean;
  uiLocale: string;
  t: (key: string) => string;
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Intl.DateTimeFormat(uiLocale, { month: "long", year: "numeric" }).format(
    new Date(currentYear, currentMonth, 1)
  );

  // Days of week labels
  const weekDayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(uiLocale, { weekday: "short" }).format(
      new Date(2024, 0, i + 1) // Jan 1 2024 is Monday
    )
  );

  // Build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Shift so week starts Monday
  const startOffset = (firstDayOfMonth + 6) % 7;

  const totalCells = Math.ceil((daysInMonth + startOffset) / 7) * 7;
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  // Convert requests to calendar leaves
  const calendarLeaves = useMemo<CalendarLeave[]>(() => {
    return requests
      .filter((r) => r.status !== "REJECTED")
      .map((r) => ({
        id: r.id,
        name: r.user?.full_name || `#${r.user_id}`,
        type: r.type,
        status: r.status,
        start: new Date(r.start_date),
        end: new Date(r.end_date),
      }));
  }, [requests]);

  // Get leaves for a specific day
  const getLeavesForDay = (day: number): CalendarLeave[] => {
    const date = new Date(currentYear, currentMonth, day);
    return calendarLeaves.filter((leave) => {
      const start = new Date(leave.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(leave.end);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <div className="app-surface rounded-2xl p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <AnimatePresence mode="wait">
          <motion.h3 
            key={`${currentYear}-${currentMonth}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="text-xl font-bold capitalize tracking-tight"
          >
            {monthName}
          </motion.h3>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-4">
            {Object.entries(LEAVE_TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                <span className="text-xs app-muted capitalize">
                  {t(`leave.type.${type.toLowerCase()}`)}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-(--border) hover:bg-(--surface-hover) transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => {
              setCurrentMonth(today.getMonth());
              setCurrentYear(today.getFullYear());
            }}
            className="px-3 h-9 text-xs font-semibold rounded-xl border border-(--border) hover:bg-(--surface-hover) transition-all"
          >
            {t("leave.calendar.today") || "Сегодня"}
          </button>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-(--border) hover:bg-(--surface-hover) transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-semibold app-muted uppercase tracking-wider py-2">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentYear}-${currentMonth}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-px bg-(--border) rounded-2xl overflow-hidden border border-(--border) shadow-sm"
          >
            {cells.map((day, idx) => {
              const dayLeaves = day ? getLeavesForDay(day) : [];
              const todayHighlight = day ? isToday(day) : false;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col gap-1.5 transition-all ${
                    day 
                      ? "bg-(--surface) hover:bg-(--surface-hover)/80 cursor-default" 
                      : "bg-(--surface-hover)/40"
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                            todayHighlight
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/10"
                              : "app-muted hover:text-(--foreground)"
                          }`}
                        >
                          {day}
                        </span>
                        {dayLeaves.length > 0 && !isApprover && (
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayLeaves.slice(0, 3).map((leave) => {
                          const colors = LEAVE_TYPE_COLORS[leave.type] || LEAVE_TYPE_COLORS.VACATION;
                          return (
                            <motion.div
                              layoutId={`leave-${leave.id}`}
                              key={leave.id}
                              title={`${leave.name} — ${t(`leave.type.${leave.type.toLowerCase()}`)}`}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg truncate border shadow-xs transition-transform hover:scale-[1.02] active:scale-95 ${colors.bg} ${colors.text} ${colors.border} ${
                                leave.status === "PENDING" ? "opacity-60 italic" : ""
                              }`}
                            >
                              {isApprover ? leave.name.split(" ")[0] : t(`leave.type.${leave.type.toLowerCase()}`)}
                            </motion.div>
                          );
                        })}
                        {dayLeaves.length > 3 && (
                          <span className="text-[10px] app-muted font-bold px-1.5 py-0.5 bg-(--surface-hover) rounded-md w-fit mx-auto">
                            +{dayLeaves.length - 3} {t("common.more") || "more"}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Legend */}
      <div className="flex md:hidden flex-wrap items-center gap-3 mt-4 pt-4 border-t border-(--border)">
        {Object.entries(LEAVE_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
            <span className="text-xs app-muted capitalize">
              {t(`leave.type.${type.toLowerCase()}`)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <span className="text-xs app-muted">{t("leave.calendar.today") || "Сегодня"}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const LeavePage = () => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const isApprover = approverRoles.has(user?.role || "");
  const uiLocale = locale === "tj" ? "tg-TJ" : "ru-RU";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");

  const [formData, setFormData] = useState<LeaveRequestPayload>({
    type: "VACATION",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const leaveTypes = useMemo(
    () =>
      LEAVE_TYPE_VALUES.map((value) => ({
        value,
        label: t(`leave.type.${value.toLowerCase()}`),
      })),
    [t]
  );

  const leaveStatusLabelMap = useMemo(
    () => ({
      PENDING: t("leave.pending"),
      APPROVED: t("leave.approved"),
      REJECTED: t("leave.rejected"),
    }),
    [t]
  );

  const fetchRequests = useCallback(async () => {
    try {
      const data = await LeaveService.getRequests();
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to fetch leave requests", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const requestsWithDays = useMemo(
    () =>
      requests.map((request) => ({
        ...request,
        effectiveDays:
          typeof request.days === "number" && request.days > 0
            ? request.days
            : calcDaysFallback(request.start_date, request.end_date),
      })),
    [requests]
  );

  const pendingCount = useMemo(() => requestsWithDays.filter((r) => r.status === "PENDING").length, [requestsWithDays]);
  const approvedCount = useMemo(() => requestsWithDays.filter((r) => r.status === "APPROVED").length, [requestsWithDays]);
  const rejectedCount = useMemo(() => requestsWithDays.filter((r) => r.status === "REJECTED").length, [requestsWithDays]);

  const approvedTotalDays = useMemo(
    () => requestsWithDays.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.effectiveDays, 0),
    [requestsWithDays]
  );

  const currentYear = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TJ_TIME_ZONE,
        year: "numeric",
      }).format(new Date()),
    []
  );

  const approvedPaidDaysCurrentYear = useMemo(() => {
    const yearFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TJ_TIME_ZONE, year: "numeric" });
    return requestsWithDays
      .filter((r) => {
        if (r.status !== "APPROVED" || r.type === "UNPAID") return false;
        return yearFormatter.format(new Date(r.start_date)) === currentYear;
      })
      .reduce((sum, r) => sum + r.effectiveDays, 0);
  }, [currentYear, requestsWithDays]);

  const utilizationPct = useMemo(
    () => Math.min(100, (approvedPaidDaysCurrentYear / TJ_STANDARD_ANNUAL_LEAVE_DAYS) * 100),
    [approvedPaidDaysCurrentYear]
  );

  const analyticsByType = useMemo(
    () =>
      leaveTypes.map((type) => {
        const typeRequests = requestsWithDays.filter((r) => r.type === type.value);
        return {
          type: type.label,
          total: typeRequests.length,
          approved: typeRequests.filter((r) => r.status === "APPROVED").length,
          days: typeRequests.reduce((sum, r) => sum + r.effectiveDays, 0),
        };
      }),
    [leaveTypes, requestsWithDays]
  );

  const monthlyApprovedDays = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => ({
      monthLabel: new Intl.DateTimeFormat(uiLocale, { month: "long", timeZone: TJ_TIME_ZONE }).format(
        new Date(Date.UTC(2026, index, 1))
      ),
      days: 0,
    }));

    requestsWithDays
      .filter((r) => r.status === "APPROVED")
      .forEach((r) => {
        const start = new Date(r.start_date);
        if (Number.isNaN(start.getTime())) return;
        const month = start.getUTCMonth();
        if (month >= 0 && month < 12) {
          months[month].days += r.effectiveDays;
        }
      });

    return months;
  }, [requestsWithDays, uiLocale]);

  const exportAnalyticsCsv = () => {
    const rows: Array<Array<string | number>> = [
      [t("leave.analytics.standard"), t("leave.analytics.standardValue")],
      [t("leave.analytics.locale"), "tg-TJ"],
      [t("leave.analytics.timezone"), TJ_TIME_ZONE],
      [t("leave.analytics.generatedAt"), formatDateWithLocale(new Date(), TJ_LOCALE)],
      [t("leave.analytics.year"), currentYear],
      [],
      [t("leave.analytics.kpi"), t("leave.analytics.value")],
      [t("leave.analytics.totalRequests"), requestsWithDays.length],
      [t("leave.analytics.pending"), pendingCount],
      [t("leave.analytics.approved"), approvedCount],
      [t("leave.analytics.rejected"), rejectedCount],
      [t("leave.analytics.approvedDaysAll"), formatNumberWithLocale(approvedTotalDays, TJ_LOCALE)],
      [t("leave.analytics.approvedPaidDaysYear"), formatNumberWithLocale(approvedPaidDaysCurrentYear, TJ_LOCALE)],
      [t("leave.analytics.annualStandardDays"), TJ_STANDARD_ANNUAL_LEAVE_DAYS],
      [t("leave.analytics.utilizationPercent"), formatNumberWithLocale(utilizationPct, TJ_LOCALE)],
      [],
      [t("leave.analytics.byTypeType"), t("leave.analytics.byTypeTotal"), t("leave.analytics.byTypeApproved"), t("leave.analytics.byTypeDays")],
      ...analyticsByType.map((row) => [row.type, row.total, row.approved, formatNumberWithLocale(row.days, TJ_LOCALE)]),
      [],
      [t("leave.analytics.month"), t("leave.analytics.approvedDays")],
      ...monthlyApprovedDays.map((row) => [row.monthLabel, formatNumberWithLocale(row.days, TJ_LOCALE)]),
    ];

    downloadCsv(`leave-analytics-tj-${Date.now()}.csv`, rows);
  };

  const exportRequestsCsv = () => {
    const rows: Array<Array<string | number>> = [
      [
        "ID",
        t("leave.table.employee"),
        t("leave.type"),
        t("leave.table.startDate"),
        t("leave.table.endDate"),
        t("leave.days"),
        t("leave.reason"),
        t("leave.status"),
      ],
      ...requestsWithDays.map((r) => [
        r.id,
        r.user?.full_name || `User #${r.user_id}`,
        t(`leave.type.${r.type.toLowerCase()}`),
        formatDateWithLocale(r.start_date, TJ_LOCALE),
        formatDateWithLocale(r.end_date, TJ_LOCALE),
        formatNumberWithLocale(r.effectiveDays, TJ_LOCALE),
        r.reason || "-",
        leaveStatusLabelMap[r.status as keyof typeof leaveStatusLabelMap] || r.status,
      ]),
    ];

    downloadCsv(`leave-requests-tj-${Date.now()}.csv`, rows);
  };

  const resetForm = () => {
    setFormData({
      type: "VACATION",
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  /**
   * Validates the leave request form data before submission.
   * Ensures dates are logical and balance is checked mentally or by API response.
   */
  const validateLeaveForm = () => {
    if (!formData.start_date || !formData.end_date) {
      setError(t("leave.errors.requiredDates") || "Please select both start and end dates.");
      return false;
    }
    
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError(t("leave.errors.endDate") || "End date cannot be before start date.");
      return false;
    }

    if (formData.reason.trim().length < 5) {
      setError(t("leave.errors.reasonLength") || "Please provide a reason (min 5 characters).");
      return false;
    }

    return true;
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    // 1. Client-side validation
    if (!validateLeaveForm()) {
      setSubmitLoading(false);
      return;
    }

    try {
      // 2. Submission to the backend Service
      await LeaveService.request({
        ...formData,
        // Normalize to ISO string for backend date parsing
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      });

      // 3. Success Workflow
      setIsModalOpen(false);
      resetForm();
      await fetchRequests();
    } catch (err: unknown) {
      // 4. Error handling with localized messages
      setError(getApiErrorMessage(err, t("leave.errors.submit")));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async (id: number, status: "APPROVED" | "REJECTED") => {
    // 1. Prompt for comments (useful for audit and multi-step clarity)
    const promptTitle = status === "APPROVED" ? t("leave.approvePrompt") || "Enter approval comments (optional):" : t("leave.rejectPrompt") || "Enter rejection reason:";
    const comments = window.prompt(promptTitle) || "";
    
    // 2. Mandatory reason for rejection
    if (status === "REJECTED" && !comments.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    try {
      // 3. Process via Workflow Service on the backend
      await LeaveService.approve(id, status, comments);
      await fetchRequests();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t("leave.errors.action")));
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("leave.title")}</h1>
          <p className="app-muted mt-2">{t("leave.subtitle.analytics")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={exportAnalyticsCsv}
            className="flex items-center gap-2 px-4 py-2.5 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-semibold text-sm transition-all"
          >
            <Download size={16} />
            {t("leave.exportAnalytics")}
          </button>
          <button
            onClick={exportRequestsCsv}
            className="flex items-center gap-2 px-4 py-2.5 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-semibold text-sm transition-all"
          >
            <Download size={16} />
            {t("leave.exportRequests")}
          </button>
          <button
            onClick={() => {
              setError("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            {t("leave.request")}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <BalanceCard
          title={t("leave.totalAvailable")}
          value={`${formatNumberWithLocale(user?.leave_balance ?? 0, uiLocale)} ${t("leave.daysShort")}`}
          colorClass="bg-indigo-500"
        />
        <BalanceCard title={isApprover ? t("leave.pendingQueue") : t("leave.pendingReview")} value={pendingCount} colorClass="bg-amber-500" />
        <BalanceCard
          title={isApprover ? t("leave.approvedDecisions") : t("leave.approvedLeaves")}
          value={approvedCount}
          colorClass="bg-emerald-500"
        />
        <BalanceCard
          title={t("leave.utilization", { year: currentYear, days: TJ_STANDARD_ANNUAL_LEAVE_DAYS })}
          value={`${formatNumberWithLocale(utilizationPct, uiLocale)}%`}
          colorClass="bg-sky-500"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 bg-(--surface-hover) rounded-xl w-fit">
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "list"
              ? "bg-(--surface-strong) shadow text-(--foreground)"
              : "app-muted hover:text-(--foreground)"
          }`}
        >
          <List size={16} />
          {t("leave.viewList") || "Список"}
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            view === "calendar"
              ? "bg-(--surface-strong) shadow text-(--foreground)"
              : "app-muted hover:text-(--foreground)"
          }`}
        >
          <CalendarDays size={16} />
          {t("leave.viewCalendar") || "Календарь"}
        </button>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LeaveCalendar
            requests={requestsWithDays}
            isApprover={isApprover}
            uiLocale={uiLocale}
            t={t}
          />
        </motion.div>
      )}

      {/* List View */}
      {view === "list" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Analytics Section */}
          <div className="app-surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="text-xl font-semibold">{t("leave.analytics.title")}</h3>
              <p className="text-xs app-muted">
                {t("leave.analytics.meta", {
                  locale: uiLocale,
                  timezone: TJ_TIME_ZONE,
                  days: TJ_STANDARD_ANNUAL_LEAVE_DAYS,
                })}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="app-surface-strong rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3">{t("leave.analytics.byType")}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider app-muted border-b border-(--border)">
                        <th className="text-left py-2">{t("leave.analytics.byTypeType")}</th>
                        <th className="text-left py-2">{t("leave.analytics.byTypeTotal")}</th>
                        <th className="text-left py-2">{t("leave.analytics.byTypeApproved")}</th>
                        <th className="text-left py-2">{t("leave.analytics.byTypeDays")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsByType.map((row) => (
                        <tr key={row.type} className="border-b border-(--border)/70 last:border-0">
                          <td className="py-2">{row.type}</td>
                          <td className="py-2">{row.total}</td>
                          <td className="py-2">{row.approved}</td>
                          <td className="py-2">{formatNumberWithLocale(row.days, uiLocale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="app-surface-strong rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-3">{t("leave.analytics.monthlyApproved")}</h4>
                <div className="space-y-2.5">
                  {monthlyApprovedDays.map((row) => {
                    const maxDays = Math.max(...monthlyApprovedDays.map((r) => r.days), 1);
                    const pct = (row.days / maxDays) * 100;
                    return (
                      <div key={row.monthLabel} className="flex items-center gap-3 text-sm">
                        <span className="capitalize app-muted w-24 shrink-0 text-xs">{row.monthLabel}</span>
                        <div className="flex-1 h-2 bg-(--border) rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-semibold w-8 text-right text-xs">{row.days}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">{isApprover ? t("leave.teamRequests") : t("leave.history")}</h3>
            <div className="app-surface rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[940px] text-left">
                <thead>
                  <tr className="bg-(--surface-hover) text-xs uppercase tracking-wider app-muted">
                    {isApprover && <th className="px-6 py-4 font-semibold">{t("leave.table.employee")}</th>}
                    <th className="px-6 py-4 font-semibold">{t("leave.type")}</th>
                    <th className="px-6 py-4 font-semibold">{t("leave.duration")}</th>
                    <th className="px-6 py-4 font-semibold">{t("leave.days")}</th>
                    <th className="px-6 py-4 font-semibold">{t("leave.reason")}</th>
                    <th className="px-6 py-4 font-semibold">{t("leave.status")}</th>
                    {isApprover && <th className="px-6 py-4 font-semibold text-right">{t("leave.table.actions")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isApprover ? 7 : 6} className="px-6 py-12 text-center app-muted">
                        <Loader2 className="animate-spin mx-auto mb-2" />
                        {t("leave.loadingRequests")}
                      </td>
                    </tr>
                  ) : requestsWithDays.length === 0 ? (
                    <tr>
                      <td colSpan={isApprover ? 7 : 6} className="px-6 py-12 text-center app-muted italic">
                        {t("leave.noRequests")}
                      </td>
                    </tr>
                  ) : (
                    requestsWithDays.map((r) => {
                      const requestDays = r.effectiveDays;
                      const colors = LEAVE_TYPE_COLORS[r.type] || LEAVE_TYPE_COLORS.VACATION;
                      return (
                        <tr key={r.id} className="border-t border-(--border) hover:bg-(--surface-hover)/50 transition-colors">
                          {isApprover && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <UserRound size={15} className="text-indigo-500" />
                                <div>
                                  <p className="text-sm font-semibold">{r.user?.full_name || `User #${r.user_id}`}</p>
                                  {r.user?.email && <p className="text-xs app-muted">{r.user.email}</p>}
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                              {t(`leave.type.${r.type.toLowerCase()}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs app-muted">
                            {formatDateWithLocale(r.start_date, uiLocale)} → {formatDateWithLocale(r.end_date, uiLocale)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">{formatNumberWithLocale(requestDays, uiLocale)}</td>
                          <td className="px-6 py-4 text-sm app-muted max-w-[280px] truncate">{r.reason || "-"}</td>
                          <td className="px-6 py-4">
                            <StatusBadge status={r.status} label={leaveStatusLabelMap[r.status as keyof typeof leaveStatusLabelMap] || r.status} />
                          </td>
                          {isApprover && (
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {r.status === "PENDING" && (
                                  <>
                                    <button
                                      onClick={() => void handleApprove(r.id, "APPROVED")}
                                      className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                      title={t("leave.approved")}
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => void handleApprove(r.id, "REJECTED")}
                                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                      title={t("leave.rejected")}
                                    >
                                      <XCircle size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="app-surface-strong rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">{t("leave.modal.title")}</h2>

              <form onSubmit={handleCreateRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium app-muted ml-1">{t("leave.modal.leaveType")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {leaveTypes.map((option) => {
                      const colors = LEAVE_TYPE_COLORS[option.value] || LEAVE_TYPE_COLORS.VACATION;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, type: option.value as LeaveRequestPayload["type"] }))}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            formData.type === option.value
                              ? `${colors.bg} ${colors.text} ${colors.border}`
                              : "border-(--border) app-muted hover:bg-(--surface-hover)"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium app-muted ml-1">{t("leave.modal.startDate")}</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full app-input px-4 py-3 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium app-muted ml-1">{t("leave.modal.endDate")}</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                      className="w-full app-input px-4 py-3 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {formData.start_date && formData.end_date && new Date(formData.end_date) >= new Date(formData.start_date) && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-sm font-semibold">
                    <CalendarDays size={15} />
                    {calcDaysFallback(formData.start_date, formData.end_date)} {t("leave.daysShort")}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium app-muted ml-1">{t("leave.modal.reasonOptional")}</label>
                  <textarea
                    rows={3}
                    value={formData.reason || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder={t("leave.modal.reasonPlaceholder")}
                    className="w-full app-input px-4 py-3 rounded-xl outline-none resize-none"
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-sm flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-xl">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-(--border) hover:bg-(--surface-hover) rounded-2xl font-semibold transition-all"
                  >
                    {t("leave.modal.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {submitLoading ? <Loader2 className="animate-spin mx-auto" /> : t("leave.modal.submit")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BalanceCard = ({
  title,
  value,
  colorClass,
}: {
  title: string;
  value: string | number;
  colorClass: string;
}) => (
  <div className="app-surface rounded-2xl p-6 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="app-muted text-sm font-medium uppercase tracking-wider">{title}</p>
      <div className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
    </div>
    <p className="text-3xl font-bold tracking-tight">{value}</p>
  </div>
);

const StatusBadge = ({ status, label }: { status: string; label: string }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
      status === "PENDING"
        ? "bg-amber-500/10 text-amber-500"
        : status === "APPROVED"
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-red-500/10 text-red-500"
    }`}
  >
    {status === "PENDING" && <Clock size={12} />}
    {status === "APPROVED" && <CheckCircle2 size={12} />}
    {status === "REJECTED" && <XCircle size={12} />}
    {label}
  </span>
);

export default LeavePage;
