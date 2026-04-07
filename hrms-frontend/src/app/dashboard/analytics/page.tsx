"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell 
} from "recharts";
import { 
  Users, TrendingUp, CreditCard, Calendar, Download, 
  Filter, ChevronRight, PieChart as PieChartIcon, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { AdminService } from "@/services/admin.service";
import { HeadcountStat, TurnoverStat, PayrollExpenseStat } from "@/types/hr";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const AnalyticsPage = () => {
  const { t, locale } = useLanguage();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  
  const [headcount, setHeadcount] = useState<HeadcountStat[]>([]);
  const [turnover, setTurnover] = useState<TurnoverStat | null>(null);
  const [expenses, setExpenses] = useState<PayrollExpenseStat[]>([]);
  
  const uiLocale = locale === "tj" ? "tg-TJ" : "ru-RU";
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#fb923c"];

  /**
   * Fetches all analytics data in parallel.
   * This is the core data loading logic for the dashboard.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [hc, to, exp] = await Promise.all([
        AdminService.getHeadcountStats(),
        AdminService.getTurnoverStats(),
        AdminService.getPayrollExpenses()
      ]);
      setHeadcount(hc || []);
      setTurnover(to);
      setExpenses(exp || []);
    } catch (error) {
      console.error("Failed to load analytics data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const totalHeadcount = useMemo(() => headcount.reduce((sum, h) => sum + h.count, 0), [headcount]);

  /**
   * Formats numbers for financial displays based on the current locale.
   */
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(uiLocale, { 
      style: "currency", 
      currency: "TJS",
      maximumFractionDigits: 0 
    }).format(val);
  };

  // Chart styling constants
  const axisStyle = {
    fontSize: 11,
    stroke: theme === "dark" ? "#94a3b8" : "#475569",
    tickLine: false,
    axisLine: false,
  };

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    fontSize: "12px"
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Organization Analytics</h1>
          <p className="text-slate-400 mt-2">Comprehensive insights into workforce performance and financials.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => void fetchData()}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all"
          >
            <Activity size={16} className="text-indigo-400" />
            Refresh Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Total Workforce" 
          value={totalHeadcount.toString()} 
          change="+12% vs last year" 
          icon={<Users className="text-indigo-400" size={24} />} 
        />
        <KPICard 
          title="Turnover Rate" 
          value={`${turnover?.turnover_rate.toFixed(1) || "0"}%`} 
          change="-2.4% vs industry avg" 
          icon={<TrendingUp className="text-emerald-400" size={24} />} 
        />
        <KPICard 
          title="Monthly Payroll" 
          value={expenses.length > 0 ? formatCurrency(expenses[expenses.length-1].total) : "0"} 
          change="Updated this month" 
          icon={<CreditCard className="text-rose-400" size={24} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Headcount Distribution */}
        <div className="app-surface rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <PieChartIcon size={20} className="text-indigo-400" />
              Department Distribution
            </h3>
          </div>
          <div className="h-[350px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">Calculating distribution...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={headcount}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="department"
                  >
                    {headcount.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {headcount.map((h, i) => (
              <div key={h.department} className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                <span className="text-xs font-semibold text-slate-300 truncate">{h.department}</span>
                <span className="ml-auto text-xs font-bold text-white">{h.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Trends */}
        <div className="app-surface rounded-3xl p-8 border border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CreditCard size={20} className="text-rose-400" />
              Financial Trends
            </h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase rounded-full border border-rose-500/20">Payroll</span>
            </div>
          </div>
          <div className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 italic">Loading financial data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={expenses}>
                  <defs>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" {...axisStyle} />
                  <YAxis {...axisStyle} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number) => [formatCurrency(val), "Monthly Expense"]} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#f43f5e" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorExp)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recruitment Pipeline Summary (Optional) */}
      <div className="app-surface rounded-3xl p-8 border border-white/5 shadow-2xl">
         <h3 className="text-xl font-bold mb-8">Recruitment Performance</h3>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <PipelineStat label="Job Openings" value="14" />
            <PipelineStat label="Applications" value="382" />
            <PipelineStat label="Interviews" value="45" />
            <PipelineStat label="Hires" value="8" />
         </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="app-surface p-8 rounded-[32px] border border-white/5 shadow-xl relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/2 blur-2xl group-hover:bg-indigo-500/5 transition-all" />
    <div className="flex items-start justify-between mb-6">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all text-indigo-400">
        {icon}
      </div>
      <div className="text-right">
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{change}</span>
      </div>
    </div>
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{title}</p>
      <h3 className="text-4xl font-bold text-white tracking-tight">{value}</h3>
    </div>
  </motion.div>
);

const PipelineStat = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center md:text-left">
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

export default AnalyticsPage;
