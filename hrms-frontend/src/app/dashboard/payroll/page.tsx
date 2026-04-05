"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Settings,
  TrendingUp,
  X,
} from "lucide-react";
import { PayrollService, SalaryUpdatePayload, UserService } from "@/services/hr.service";
import { Payslip } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { UserProfile } from "@/types/auth";

const PayrollPage = () => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [salaryForm, setSalaryForm] = useState<SalaryUpdatePayload>({
    user_id: 0,
    base_salary: 0,
    currency: "USD",
    bank_name: "",
    account_number: "",
    tax_id: "",
    reason: "",
  });

  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";
  const dateLocale = locale === "ru" ? "ru-RU" : "tg-TJ";

  const fetchPayslips = useCallback(async () => {
    try {
      const data = await PayrollService.getMyPayslips();
      setPayslips(data || []);
    } catch (err) {
      console.error("Failed to fetch payslips", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const fetchUsers = useCallback(async () => {
    if (!isAdminOrHR) return;
    setUsersLoading(true);
    try {
      const data = await UserService.getAll();
      setUsers(data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdminOrHR]);

  const handleGenerate = async () => {
    setGenerateLoading(true);
    setMessage(null);
    const now = new Date();

    try {
      await PayrollService.generateMonthly(now.getMonth() + 1, now.getFullYear());
      setMessage({
        type: "success",
        text: t("payroll.generateSuccess", "Monthly payslips generated successfully."),
      });
      await fetchPayslips();
    } catch (err: unknown) {
      const apiError =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : t("payroll.generateError", "Failed to generate payslips.");

      setMessage({ type: "error", text: apiError });
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

  const handleApplySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!salaryForm.user_id || salaryForm.base_salary <= 0) {
      setMessage({
        type: "error",
        text: t("payroll.fillRequired", "Please select employee and base salary."),
      });
      return;
    }

    setSalarySubmitting(true);
    try {
      await PayrollService.updateSalary(salaryForm);
      setMessage({
        type: "success",
        text: t("payroll.salaryApplied", "Compensation settings applied successfully."),
      });
      setShowSettingsModal(false);
      setSalaryForm({
        user_id: 0,
        base_salary: 0,
        currency: "USD",
        bank_name: "",
        account_number: "",
        tax_id: "",
        reason: "",
      });
    } catch (err: unknown) {
      const apiError =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (err as { response: { data: { error: string } } }).response.data.error
          : t("payroll.salaryApplyError", "Failed to apply compensation settings.");

      setMessage({ type: "error", text: apiError });
    } finally {
      setSalarySubmitting(false);
    }
  };

  const getMonthName = (month: number) =>
    new Date(2000, month - 1, 1).toLocaleString(dateLocale, { month: "long" });

  const latestPayslip = payslips[0];
  const currentYear = new Date().getFullYear();
  const ytdEarnings = useMemo(
    () =>
      payslips
        .filter((slip) => slip.year === currentYear)
        .reduce((sum, slip) => sum + (slip.net_amount || 0), 0),
    [payslips, currentYear]
  );
  const taxEstimate = ytdEarnings * 0.18;

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-10">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("payroll.title", "Payroll & Compensation")}</h1>
          <p className="app-muted mt-2">
            {t("payroll.subtitle", "View your earnings, deductions, and payment history.")}
          </p>
        </div>
        {isAdminOrHR && (
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generateLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generateLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              {t("payroll.generateMonthly", "Generate Monthly Payroll")}
            </button>
            <button
              onClick={openSettingsModal}
              className="flex items-center gap-2 px-5 py-2.5 app-surface-strong hover:bg-[var(--surface-hover)] rounded-xl font-semibold transition-all"
            >
              <Settings size={18} />
              {t("payroll.manageSalary", "Compensation Settings")}
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-linear-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-xl relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <CreditCard size={80} />
          </div>
          <p className="text-indigo-100 text-sm font-medium mb-1">
            {t("payroll.baseSalary", "Base Monthly Salary")}
          </p>
          <h2 className="text-4xl font-black tracking-tight">
            {latestPayslip ? `$${latestPayslip.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "--"}
          </h2>
          <div className="mt-4 flex items-center gap-2 text-indigo-200 text-sm">
            <TrendingUp size={16} />
            <span>{t("payroll.nextPayout", "Next payout on scheduled payroll date")}</span>
          </div>
        </div>

        <PayrollStatCard
          title={t("payroll.ytd", "Total YTD Earnings")}
          value={`$${ytdEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${t("payroll.period", "Period")}: ${currentYear}`}
        />
        <PayrollStatCard
          title={t("payroll.taxes", "Tax Deductions")}
          value={`$${taxEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={t("payroll.taxEstimate", "Estimated 18%")}
        />
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm border font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </motion.div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-bold ml-1 flex items-center gap-2">
          <FileText className="text-indigo-500" size={20} />
          {t("payroll.history", "Payslip History")}
        </h3>
        <div className="app-surface rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--surface-hover)] text-xs uppercase tracking-wider app-muted">
                <th className="px-6 py-4 font-semibold">{t("payroll.period", "Period")}</th>
                <th className="px-6 py-4 font-semibold">{t("payroll.netAmount", "Net Amount")}</th>
                <th className="px-6 py-4 font-semibold">{t("payroll.status", "Status")}</th>
                <th className="px-6 py-4 font-semibold">{t("payroll.generatedAt", "Generated On")}</th>
                <th className="px-6 py-4 font-semibold text-right">{t("payroll.action", "Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center app-muted">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    {t("payroll.loading", "Loading payslips...")}
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-3 app-muted">
                      <FileText size={48} className="mx-auto" />
                      <p className="font-medium italic">{t("payroll.noPayslips", "No payslips generated for this period.")}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold capitalize">{getMonthName(slip.month)}</span>
                        <span className="text-xs app-muted">{slip.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-indigo-500 font-bold">
                        ${slip.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          slip.status === "PAID" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {t(`payroll.status.${String(slip.status).toLowerCase()}`, slip.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm app-muted">{new Date(slip.generated_at).toLocaleDateString(dateLocale)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-2 hover:bg-[var(--surface-hover)] rounded-xl app-muted transition-colors"
                          title={t("payroll.view", "View")}
                          type="button"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="p-2 hover:bg-[var(--surface-hover)] rounded-xl app-muted transition-colors"
                          title={t("payroll.download", "Download")}
                          type="button"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSettingsModal && isAdminOrHR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleApplySalary} className="app-surface-strong rounded-2xl p-6 w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("payroll.manageSalary", "Compensation Settings")}</h2>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.employee", "Employee")}</label>
                <select
                  value={salaryForm.user_id || ""}
                  onChange={(e) => setSalaryForm((prev) => ({ ...prev, user_id: Number(e.target.value) || 0 }))}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  required
                >
                  <option value="">{t("payroll.selectEmployee", "Select employee")}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
                {usersLoading && <p className="text-xs app-muted mt-1">{t("payroll.loadingUsers", "Loading users...")}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.baseSalary", "Base Salary")}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salaryForm.base_salary || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, base_salary: Number(e.target.value) || 0 }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.currency", "Currency")}</label>
                  <input
                    value={salaryForm.currency || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                    placeholder="USD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.bankName", "Bank Name")}</label>
                  <input
                    value={salaryForm.bank_name || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.accountNumber", "Account Number")}</label>
                  <input
                    value={salaryForm.account_number || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, account_number: e.target.value }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.taxId", "Tax ID")}</label>
                  <input
                    value={salaryForm.tax_id || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, tax_id: e.target.value }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium app-muted mb-1.5">{t("payroll.reason", "Reason")}</label>
                  <input
                    value={salaryForm.reason || ""}
                    onChange={(e) => setSalaryForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {t("payroll.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={salarySubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salarySubmitting ? t("payroll.applying", "Applying...") : t("payroll.apply", "Apply")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const PayrollStatCard = ({ title, value, sub }: { title: string; value: string; sub: string }) => (
  <div className="app-surface rounded-3xl p-6 shadow-sm">
    <p className="app-muted text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
    <p className="text-3xl font-bold tracking-tight mb-2">{value}</p>
    <p className="text-xs text-indigo-500 font-medium">{sub}</p>
  </div>
);

export default PayrollPage;
