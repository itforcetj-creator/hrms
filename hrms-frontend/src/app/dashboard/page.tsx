"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, CartesianGrid 
} from "recharts";
import { 
  Download, FileText, Users, Clock, CreditCard, TrendingUp, Zap, ChevronRight, History, 
  PlusCircle, UserPlus, FileUp 
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { HeadcountStat, TurnoverStat, AttendanceStat, PayrollExpenseStat, AuditLog } from "@/types/hr";
import { PermissionGate } from "@/components/PermissionGate";
import { RoleAdmin, RoleHR } from "@/utils/permission";

const DashboardPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [headcount, setHeadcount] = useState<HeadcountStat[]>([]);
  const [turnover, setTurnover] = useState<TurnoverStat | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStat | null>(null);
  const [expenses, setExpenses] = useState<PayrollExpenseStat[]>([]);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [hc, to, att, exp, logs] = await Promise.all([
        AdminService.getHeadcountStats(),
        AdminService.getTurnoverStats(),
        AdminService.getAttendanceStats(),
        AdminService.getPayrollExpenses(),
        AdminService.getAuditLogs(),
      ]);
      setHeadcount(hc || []);
      setTurnover(to);
      setAttendance(att);
      setExpenses(exp || []);
      setActivities((logs || []).slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "DIRECTOR" || user?.role === "HR") {
      void fetchAnalytics();
    } else if (user && !["ADMIN", "HR", "DIRECTOR"].includes(user.role)) {
      router.replace("/dashboard/profile");
    }
  }, [user, router]);

  const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];
  const axisColor = theme === "dark" ? "#94a3b8" : "#475569";
  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
    border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(15, 23, 42, 0.12)",
    borderRadius: "12px",
    color: theme === "dark" ? "#f8fafc" : "#0f172a",
  };

  const exportCsv = () => {
    const headers = ["Department", "Count"];
    const rows = headcount.map(h => [h.department, h.count]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "headcount_report.csv");
    link.click();
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      {/* Header with Quick Actions */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold tracking-tight">
            {t("dashboard.welcomeBack")},{" "}
            <span className="text-indigo-400">{user?.full_name?.split(" ")[0] || "Admin"}</span>!
          </h1>
          <p className="app-muted mt-1 flex items-center gap-2">
            <History size={14} className="text-indigo-500/50" />
            {today}
          </p>
        </motion.div>
        
        <div className="flex flex-wrap gap-2">
          <PermissionGate role={RoleHR}>
             <QuickActionButton icon={<UserPlus size={16} />} label="Add Employee" onClick={() => router.push("/dashboard/users?action=new")} />
             <QuickActionButton icon={<PlusCircle size={16} />} label="Post Job" onClick={() => router.push("/dashboard/recruitment?action=new")} />
          </PermissionGate>
          <QuickActionButton icon={<FileUp size={16} />} label="Request Leave" onClick={() => router.push("/dashboard/leave?action=new")} />
          <div className="h-10 w-px bg-(--border) mx-2 hidden sm:block" />
          <button 
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 border border-(--border) hover:bg-(--surface-hover) rounded-xl font-medium transition-all text-sm shadow-sm"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users className="text-indigo-500" size={20} />} 
          title={t("dashboard.totalEmployees")} 
          value={turnover?.total_count.toString() || "0"} 
          change="+2" 
        />
        <StatCard 
          icon={<TrendingUp className="text-emerald-500" size={20} />} 
          title={t("dashboard.turnoverRate")} 
          value={`${turnover?.turnover_rate.toFixed(1) || "0"}%`} 
          change="-0.5%" 
        />
        <StatCard 
          icon={<Clock className="text-amber-500" size={20} />} 
          title="Latecomers Today" 
          value={String(attendance?.latecomers || 0)} 
          change="Last 30d" 
        />
        <StatCard 
          icon={<CreditCard className="text-rose-500" size={20} />} 
          title="Avg. Expenses" 
          value={expenses.length > 0 ? (expenses[expenses.length-1].total / 1000).toFixed(1) + "k" : "0"} 
          change="Monthly" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Analytics Section */}
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Headcount Chart */}
            <div className="app-surface rounded-3xl p-8 shadow-xl border border-(--border)/50">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Users size={18} className="text-indigo-400" />
                {t("dashboard.headcountByDept")}
              </h3>
              <div className="h-[300px]">
                {isMounted && headcount.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={headcount}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                      <XAxis dataKey="department" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#6366f1" }} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                        {headcount.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Loading analytics...</div>
                )}
              </div>
            </div>

            {/* Expenses Chart */}
            <div className="app-surface rounded-3xl p-8 shadow-xl border border-(--border)/50">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <CreditCard size={18} className="text-rose-400" />
                Payroll Expenses
              </h3>
              <div className="h-[300px]">
                {isMounted && expenses.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenses}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                      <XAxis dataKey="month" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="total" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">No payroll data recorded.</div>
                )}
              </div>
            </div>
          </div>

          {/* Distribution Section */}
          <div className="app-surface rounded-3xl p-8 shadow-xl border border-(--border)/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -z-10 rounded-full" />
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-lg font-semibold">{t("dashboard.companyDistribution")}</h3>
               <Link href="/dashboard/analytics" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 transition-colors">
                  Full Report <ChevronRight size={14} />
               </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="h-[260px] w-full">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={headcount}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="count"
                        nameKey="department"
                        stroke="none"
                      >
                        {headcount.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {headcount.slice(0, 4).map((h, i) => (
                   <div key={h.department} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                         <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                         <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{h.department}</span>
                      </div>
                      <p className="text-xl font-bold">{h.count} <span className="text-xs font-normal text-slate-600">staff</span></p>
                   </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                Recent Activity
             </h3>
             <PermissionGate role={RoleAdmin}>
                <Link href="/dashboard/audit" className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                  All Logs
                </Link>
             </PermissionGate>
          </div>
          
          <div className="space-y-4">
             {loading ? (
                [1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)
             ) : activities.length === 0 ? (
                <div className="p-8 text-center text-slate-600 italic bg-white/2 rounded-2xl border border-white/5 text-sm">No recent activity detected.</div>
             ) : (
                <AnimatePresence>
                   {activities.map((log, idx) => (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group flex items-start gap-4 p-4 rounded-2xl bg-white/3 hover:bg-white/5 border border-white/5 transition-all cursor-default"
                      >
                         <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {log.action.includes("CREATE") ? <PlusCircle size={18} /> : log.action.includes("UPDATE") ? <Zap size={18} /> : <FileText size={18} />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/90 truncate group-hover:text-indigo-400 transition-colors">{log.message}</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight font-medium">By User #{log.user_id} • {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                         </div>
                      </motion.div>
                   ))}
                </AnimatePresence>
             )}
          </div>

          <div className="p-6 bg-linear-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-10 -translate-y-10" />
             <h4 className="font-bold mb-2">Pro Tip: Command Palette</h4>
             <p className="text-xs text-indigo-100 leading-relaxed mb-4">
                Press <span className="bg-white/20 px-1.5 py-0.5 rounded-sm font-mono tracking-tighter">⌘ K</span> to quickly jump between employees, recruitment jobs, and system settings from anywhere.
             </p>
             <button 
                onClick={() => {
                  const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                  window.dispatchEvent(event);
                }}
                className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-md border border-white/20"
             >
               Try it now
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickActionButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1e293b]/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) => (
  <div className="app-surface p-6 rounded-3xl border border-(--border)/50 hover:shadow-2xl transition-all relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-24 h-24 bg-white/2 blur-2xl group-hover:bg-indigo-500/5 transition-all -z-10" />
    <div className="flex items-start justify-between mb-4">
      <div className="p-3 rounded-2xl bg-(--surface-hover) border border-(--border)/50 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-500 text-indigo-400">
        {icon}
      </div>
      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
        change.includes("+") ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"
      }`}>
        {change}
      </span>
    </div>
    <div>
      <p className="app-muted text-[10px] font-bold uppercase tracking-widest mb-1.5">{title}</p>
      <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
    </div>
  </div>
);

import Link from "next/link";
export default DashboardPage;
