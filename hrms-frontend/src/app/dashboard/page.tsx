"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { AdminService } from "@/services/admin.service";
import { HeadcountStat, TurnoverStat } from "@/types/hr";

const DashboardPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [headcount, setHeadcount] = useState<HeadcountStat[]>([]);
  const [turnover, setTurnover] = useState<TurnoverStat | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const hc = await AdminService.getHeadcountStats();
      const to = await AdminService.getTurnoverStats();
      setHeadcount(hc);
      setTurnover(to);
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "DIRECTOR") {
      const timer = window.setTimeout(() => {
        void fetchAnalytics();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [user]);

  const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];
  const axisColor = theme === "dark" ? "#94a3b8" : "#475569";
  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
    border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(15, 23, 42, 0.12)",
    borderRadius: "12px",
    color: theme === "dark" ? "#f8fafc" : "#0f172a",
  };

  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-4xl font-bold mb-2 tracking-tight">
          {t("dashboard.welcomeBack")},{" "}
          <span className="text-indigo-400">{user?.full_name?.split(" ")[0] || "Admin"}</span>!
        </h1>
        <p className="app-muted mb-8 max-w-2xl">
          {t("dashboard.analyticsIntro")} {today}.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title={t("dashboard.totalEmployees")} value={turnover?.total_count.toString() || "0"} change="+12%" />
          <StatCard title={t("dashboard.turnoverRate")} value={`${turnover?.turnover_rate.toFixed(1) || "0"}%`} change={t("common.annual")} />
          <StatCard title={t("dashboard.activeDepartments")} value={headcount.length.toString() || "0"} change={t("common.stable")} />
          <StatCard title={t("dashboard.upcomingInterviews")} value="12" change={t("common.today")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="app-surface rounded-3xl p-8 min-h-[400px] backdrop-blur-sm shadow-xl app-theme-transition">
            <h3 className="text-lg font-semibold mb-6">{t("dashboard.headcountByDept")}</h3>
            <div className="h-[300px]">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={headcount}>
                    <XAxis dataKey="department" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#6366f1" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {headcount.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="app-surface rounded-3xl p-8 min-h-[400px] backdrop-blur-sm shadow-xl items-center flex flex-col justify-center app-theme-transition">
            <h3 className="text-lg font-semibold mb-6 self-start">{t("dashboard.companyDistribution")}</h3>
            <div className="h-[300px] w-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={headcount}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="department"
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
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, change }: { title: string; value: string; change: string }) => (
  <div className="app-surface backdrop-blur-sm p-6 rounded-2xl hover:shadow-lg transition-all app-theme-transition">
    <p className="app-muted text-sm font-medium mb-1">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="text-3xl font-bold text-[var(--foreground)]">{value}</h3>
      <span
        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          change.includes("+") ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
        }`}
      >
        {change}
      </span>
    </div>
  </div>
);

export default DashboardPage;
