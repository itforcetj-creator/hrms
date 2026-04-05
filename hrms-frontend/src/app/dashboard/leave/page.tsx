"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  UserRound,
  XCircle,
} from "lucide-react";
import { LeaveService, LeaveRequestPayload } from "@/services/hr.service";
import { LeaveRequest } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";

const leaveTypes: Array<{ value: LeaveRequestPayload["type"]; label: string }> = [
  { value: "VACATION", label: "Vacation" },
  { value: "SICK", label: "Sick" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "MATERNITY", label: "Maternity" },
];

const approverRoles = new Set(["ADMIN", "HR", "DEPARTMENT_HEAD", "DIRECTOR"]);

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

const LeavePage = () => {
  const { user } = useAuth();
  const isApprover = approverRoles.has(user?.role || "");

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<LeaveRequestPayload>({
    type: "VACATION",
    start_date: "",
    end_date: "",
    reason: "",
  });

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
    fetchRequests();
  }, [fetchRequests]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === "PENDING").length, [requests]);
  const approvedCount = useMemo(() => requests.filter((r) => r.status === "APPROVED").length, [requests]);

  const resetForm = () => {
    setFormData({
      type: "VACATION",
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError("End date must be after or equal to start date.");
      setSubmitLoading(false);
      return;
    }

    try {
      await LeaveService.request({
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
      });
      setIsModalOpen(false);
      resetForm();
      await fetchRequests();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to submit request."));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      await LeaveService.approve(id, status);
      await fetchRequests();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Action failed."));
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="app-muted mt-2">Submit leave requests, review approvals, and track balances.</p>
        </div>
        <button
          onClick={() => {
            setError("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
        >
          <Plus size={18} />
          Request Leave
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <BalanceCard title="Total Available" value={`${user?.leave_balance ?? 0} Days`} colorClass="bg-indigo-500" />
        <BalanceCard title={isApprover ? "Pending Queue" : "Pending Review"} value={pendingCount} colorClass="bg-amber-500" />
        <BalanceCard title={isApprover ? "Approved Decisions" : "Approved Leaves"} value={approvedCount} colorClass="bg-emerald-500" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">{isApprover ? "Team Leave Requests" : "Your Leave History"}</h3>
        <div className="app-surface rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead>
              <tr className="bg-[var(--surface-hover)] text-xs uppercase tracking-wider app-muted">
                {isApprover && <th className="px-6 py-4 font-semibold">Employee</th>}
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Duration</th>
                <th className="px-6 py-4 font-semibold">Days</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                {isApprover && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isApprover ? 7 : 6} className="px-6 py-12 text-center app-muted">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={isApprover ? 7 : 6} className="px-6 py-12 text-center app-muted italic">
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const requestDays = typeof r.days === "number" && r.days > 0 ? r.days : calcDaysFallback(r.start_date, r.end_date);
                  return (
                    <tr key={r.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]/50 transition-colors">
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
                      <td className="px-6 py-4 text-sm font-semibold">{r.type}</td>
                      <td className="px-6 py-4 text-xs app-muted">
                        {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">{requestDays}</td>
                      <td className="px-6 py-4 text-sm app-muted max-w-[280px] truncate">{r.reason || "-"}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      {isApprover && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleApprove(r.id, "APPROVED")}
                                  className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleApprove(r.id, "REJECTED")}
                                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                  title="Reject"
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="app-surface-strong rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Request New Leave</h2>

              <form onSubmit={handleCreateRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium app-muted ml-1">Leave Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as LeaveRequestPayload["type"] }))}
                    className="w-full app-input px-4 py-3 rounded-xl outline-none"
                  >
                    {leaveTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium app-muted ml-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full app-input px-4 py-3 rounded-xl outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium app-muted ml-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                      className="w-full app-input px-4 py-3 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium app-muted ml-1">Reason (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.reason || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Provide a brief explanation..."
                    className="w-full app-input px-4 py-3 rounded-xl outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 border border-[var(--border)] hover:bg-[var(--surface-hover)] rounded-2xl font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {submitLoading ? <Loader2 className="animate-spin mx-auto" /> : "Submit Request"}
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

const StatusBadge = ({ status }: { status: string }) => (
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
    {status}
  </span>
);

export default LeavePage;
