"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Users, CalendarDays, MapPin, Check, Building2,
} from "lucide-react";
import { AttendanceService } from "@/services/hr.service";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import axiosInstance from "@/lib/axios";

/* ─── types ─── */
interface EmployeeRow {
  id: number;
  full_name: string;
  role: string;
  department: string;
  days: Record<string, string>; // "1" -> "PRESENT"|"ABSENT"|"LATE"|"ON_LEAVE"|""
}

interface MatrixResponse {
  month: number;
  year: number;
  days_in_month: number;
  employees: EmployeeRow[];
}

/* ─── constants ─── */
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PRESENT:  { bg: "bg-emerald-500",    text: "text-white",       label: "Present"  },
  LATE:     { bg: "bg-amber-400",      text: "text-white",       label: "Late"     },
  ON_LEAVE: { bg: "bg-blue-500",       text: "text-white",       label: "On Leave" },
  ABSENT:   { bg: "bg-transparent",    text: "text-transparent", label: "Absent"   },
  "":       { bg: "bg-transparent",    text: "text-transparent", label: ""         },
};

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

/* ─── service call wrappers ─── */
async function fetchMatrix(month: number, year: number, departmentId?: number): Promise<MatrixResponse> {
  const params: Record<string, string | number> = { month, year };
  if (departmentId) params.department_id = departmentId;
  const res = await axiosInstance.get<MatrixResponse>("/admin/v1/attendance/department", { params });
  return res.data;
}

async function markDay(userId: number, date: string, status: string) {
  await axiosInstance.post("/admin/v1/attendance/mark", { user_id: userId, date, status });
}

async function unmarkDay(userId: number, date: string) {
  await axiosInstance.post("/admin/v1/attendance/unmark", { user_id: userId, date });
}

/* ─── main component ─── */
const AttendancePage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const isManager = user?.role === "DEPARTMENT_HEAD";
  const isAdminHRDirector = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "DIRECTOR";
  const canManage = isManager || isAdminHRDirector;

  /* month/year selector */
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  /* matrix data */
  const [matrix, setMatrix]   = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  /* optimistic state overlay: cellKey -> status */
  const [pending, setPending] = useState<Record<string, boolean>>({}); // key -> is saving

  /* clock-in/out */
  const [actionLoading, setActionLoading] = useState(false);
  const [clockMsg, setClockMsg] = useState<{ type: "success"|"error"; text: string } | null>(null);

  /* department filter (admin/HR only) */
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);

  /* fetch departments list for admin */
  useEffect(() => {
    if (!isAdminHRDirector) return;
    axiosInstance.get<{ id: number; name: string }[]>("/api/v1/departments")
      .then(r => setDepartments(r.data))
      .catch(() => {});
  }, [isAdminHRDirector]);

  /* fetch matrix */
  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await fetchMatrix(month, year, selectedDept);
      setMatrix(data);
    } catch {
      setError(t("attendance.loadingDataError"));
    } finally {
      setLoading(false);
    }
  }, [month, year, selectedDept]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  /* navigate months */
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  /* toggle a cell */
  const toggleCell = async (empId: number, day: number, currentStatus: string) => {
    if (!canManage) return;
    const date = dateStr(year, month, day);
    const key = `${empId}-${day}`;

    // optimistic update
    const newStatus = currentStatus === "PRESENT" ? "" : "PRESENT";
    setMatrix(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        employees: prev.employees.map(e =>
          e.id === empId
            ? { ...e, days: { ...e.days, [String(day)]: newStatus } }
            : e
        ),
      };
    });

    setPending(p => ({ ...p, [key]: true }));
    try {
      if (newStatus === "PRESENT") {
        await markDay(empId, date, "PRESENT");
      } else {
        await unmarkDay(empId, date);
      }
    } catch {
      // revert on failure
      setMatrix(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          employees: prev.employees.map(e =>
            e.id === empId
              ? { ...e, days: { ...e.days, [String(day)]: currentStatus } }
              : e
          ),
        };
      });
    } finally {
      setPending(p => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  /* clock-in / clock-out for regular users */
  const handleClockIn = async () => {
    setActionLoading(true); setClockMsg(null);
    try {
      await AttendanceService.clockIn();
      setClockMsg({ type: "success", text: t("attendance.clockInSuccess") });
      void fetchData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setClockMsg({ type: "error", text: msg ?? "Failed to clock in." });
    } finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true); setClockMsg(null);
    try {
      const res = await AttendanceService.clockOut();
      setClockMsg({ type: "success", text: t("attendance.clockOutSuccess", { hours: res.total_hours.toFixed(2) }) });
      void fetchData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setClockMsg({ type: "error", text: msg ?? "Failed to clock out." });
    } finally { setActionLoading(false); }
  };

  const days = matrix ? Array.from({ length: matrix.days_in_month }, (_, i) => i + 1) : [];

  /* ── summary stats ── */
  const totalPresent = matrix?.employees.reduce((acc, e) =>
    acc + Object.values(e.days).filter(s => s === "PRESENT").length, 0) ?? 0;
  const totalCells   = (matrix?.employees.length ?? 0) * days.length;

  return (
    <div className="p-6 max-w-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <CalendarDays className="text-indigo-400" size={28} />
              {t("attendance.title")}
            </h1>
            <p className="app-muted mt-1 text-sm">
              {isManager ? t("attendance.managerView") : t("attendance.adminView")}
            </p>
          </div>

          {/* Clock-in/out for regular users */}
          {!canManage && (
            <div className="flex gap-3">
              <button
                onClick={() => void handleClockIn()}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                {t("attendance.clockIn")}
              </button>
              <button
                onClick={() => void handleClockOut()}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-(--surface-hover) border border-(--border) font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                {t("attendance.clockOut")}
              </button>
            </div>
          )}
        </div>

        {/* Clock message */}
        <AnimatePresence>
          {clockMsg && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
                clockMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {clockMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {clockMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats strip ── */}
        {matrix && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t("attendance.stats.employees")} value={matrix.employees.length} icon={<Users size={18} className="text-indigo-400" />} />
            <StatCard label={t("attendance.stats.presentDays")} value={totalPresent} icon={<Check size={18} className="text-emerald-400" />} />
            <StatCard label={t("attendance.stats.attendanceRate")} value={totalCells ? `${Math.round(totalPresent / totalCells * 100)}%` : "—"} icon={<CalendarDays size={18} className="text-purple-400" />} />
            <StatCard label={t("attendance.stats.month")} value={`${t(`common.months.${month - 1}`)} ${year}`} icon={<Clock size={18} className="text-amber-400" />} />
          </div>
        )}

        {/* ── Controls row ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-all app-muted hover:text-[var(--foreground)]">
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 text-sm font-semibold min-w-36 text-center">
              {t(`common.months.${month - 1}`)} {year}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-all app-muted hover:text-[var(--foreground)]">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Department filter (admin/HR only) */}
          {isAdminHRDirector && departments.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={15} className="app-muted" />
              <select
                value={selectedDept ?? ""}
                onChange={e => setSelectedDept(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">{t("attendance.allDepartments")}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto text-xs app-muted">
            <LegendDot color="bg-emerald-500" label={t("attendance.status.present")} />
            <LegendDot color="bg-amber-400" label={t("attendance.status.late")} />
            <LegendDot color="bg-blue-500" label={t("attendance.status.onLeave")} />
            <LegendDot color="bg-[var(--border)]" label={t("attendance.status.absent")} />
            {canManage && <span className="text-indigo-400 font-medium">{t("attendance.toggleNote")}</span>}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── Matrix grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 app-muted">
            <Loader2 size={28} className="animate-spin mr-3" /> {t("attendance.loadingData")}
          </div>
        ) : matrix && matrix.employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 app-muted">
            <Users size={36} className="opacity-30 mb-3" />
            <p>{t("attendance.noEmployees")}</p>
          </div>
        ) : matrix ? (
          <div className="app-surface rounded-2xl border border-[var(--border)] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                {/* Day numbers */}
                <tr className="border-b border-[var(--border)]">
                  <th className="sticky left-0 z-20 bg-[var(--surface)] py-3 px-4 text-left text-xs font-semibold app-muted uppercase tracking-wider min-w-48 border-r border-[var(--border)]">
                    {t("attendance.matrix.employee")}
                  </th>
                  {days.map(d => {
                    const weekend = isWeekend(year, month, d);
                    const dow = getDayOfWeek(year, month, d);
                    const isToday = d === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                    return (
                      <th
                        key={d}
                        className={`py-2 px-1 text-center min-w-[36px] text-xs font-semibold ${
                          weekend ? "app-muted opacity-50" : "app-muted"
                        } ${isToday ? "text-indigo-400" : ""}`}
                      >
                        <div className={`text-[10px] leading-none mb-0.5 ${isToday ? "text-indigo-400" : "opacity-50"}`}>
                          {t(`common.days.${dow}`)}
                        </div>
                        <div className={`w-6 h-6 flex items-center justify-center mx-auto rounded-full text-xs font-bold ${
                          isToday ? "bg-indigo-600 text-white" : ""
                        }`}>
                          {d}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-4 text-center text-xs font-semibold app-muted uppercase tracking-wider min-w-16">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.employees.map((emp, rowIdx) => {
                  const presentCount = Object.values(emp.days).filter(s => s === "PRESENT").length;
                  return (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: rowIdx * 0.02 }}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]/50 transition-colors"
                    >
                      {/* Employee info */}
                      <td className="sticky left-0 z-10 bg-[var(--surface)] border-r border-[var(--border)] py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xs">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate max-w-32">{emp.full_name}</p>
                            <p className="text-xs app-muted truncate">{emp.department || emp.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map(d => {
                        const status = emp.days[String(d)] ?? "";
                        const key = `${emp.id}-${d}`;
                        const isPending = !!pending[key];
                        const weekend = isWeekend(year, month, d);
                        const isPresent = status === "PRESENT";

                        return (
                          <td
                            key={d}
                            className={`py-2 px-1 text-center ${weekend ? "opacity-40" : ""}`}
                          >
                            <button
                              type="button"
                              disabled={!canManage || isPending || weekend}
                              onClick={() => !weekend && !isPending && void toggleCell(emp.id, d, status)}
                              title={
                                weekend ? t("attendance.isWeekend") :
                                canManage ? (isPresent ? t("attendance.markAbsent") : t("attendance.markPresent")) :
                                (STATUS_CONFIG[status]?.label || t("attendance.status.absent"))
                              }
                              className={`
                                w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all
                                ${canManage && !weekend ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"}
                                ${isPresent
                                  ? "bg-emerald-500 shadow-md shadow-emerald-500/30"
                                  : status === "LATE"
                                  ? "bg-amber-400 shadow-md shadow-amber-400/30"
                                  : status === "ON_LEAVE"
                                  ? "bg-blue-500 shadow-md shadow-blue-500/30"
                                  : canManage
                                  ? "border-2 border-dashed border-[var(--border)] hover:border-emerald-500/50"
                                  : "border border-[var(--border)]"
                                }
                              `}
                            >
                              {isPending ? (
                                <Loader2 size={11} className="animate-spin text-white/70" />
                              ) : isPresent ? (
                                <Check size={12} className="text-white" strokeWidth={3} />
                              ) : status === "LATE" ? (
                                <span className="text-white text-[9px] font-bold">L</span>
                              ) : status === "ON_LEAVE" ? (
                                <span className="text-white text-[9px] font-bold">OL</span>
                              ) : null}
                            </button>
                          </td>
                        );
                      })}

                      {/* Total present */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-sm font-bold ${
                          presentCount >= days.length * 0.8 ? "text-emerald-400" :
                          presentCount >= days.length * 0.5 ? "text-amber-400" : "text-red-400"
                        }`}>
                          {presentCount}
                          <span className="text-[10px] app-muted font-normal">/{days.length}</span>
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Note for managers */}
        {canManage && matrix && (
          <p className="text-xs app-muted text-center">
            {t("attendance.toggleNote")}
          </p>
        )}

      </motion.div>
    </div>
  );
};

/* ─── tiny helpers ─── */
function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="app-surface rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs app-muted uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-3 h-3 rounded-sm ${color} border border-[var(--border)]`} />
      {label}
    </span>
  );
}

export default AttendancePage;
