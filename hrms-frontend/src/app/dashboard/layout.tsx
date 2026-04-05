"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  LogOut,
  User,
  Clock,
  CalendarDays,
  CreditCard,
  Target,
  ShieldAlert,
  History,
  Bell,
  Megaphone,
  Laptop,
  ClipboardList,
  Building2,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationService } from "@/services/communication.service";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const isRole = (roles: string[]) => user && roles.includes(user.role);
  const displayTheme = mounted ? theme : "dark";
  const themeToggleTitle = mounted
    ? t(displayTheme === "dark" ? "common.switchToLight" : "common.switchToDark")
    : t("common.toggleTheme");

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const notifs = await NotificationService.getAll();
        if (isMounted) setUnreadCount(notifs.filter((n) => !n.is_read).length);
      } catch {
        // Ignore polling issues when backend is unavailable.
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen app-shell app-theme-transition">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-[var(--surface)] backdrop-blur-md border-r border-[var(--border)] flex flex-col app-theme-transition">
          <div className="p-6 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              HRMS Core
            </h2>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={toggleTheme}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--foreground)] hover:scale-105 transition-all"
                aria-label="Toggle theme"
                title={themeToggleTitle}
              >
                {displayTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
            <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />} label={t("nav.overview")} active={pathname === "/dashboard"} />
            <NavItem href="/dashboard/attendance" icon={<Clock size={18} />} label={t("nav.attendance")} active={pathname === "/dashboard/attendance"} />
            <NavItem href="/dashboard/leave" icon={<CalendarDays size={18} />} label={t("nav.leave")} active={pathname === "/dashboard/leave"} />
            <NavItem href="/dashboard/payroll" icon={<CreditCard size={18} />} label={t("nav.payroll")} active={pathname === "/dashboard/payroll"} />
            <NavItem href="/dashboard/performance" icon={<Target size={18} />} label={t("nav.performance")} active={pathname === "/dashboard/performance"} />
            <NavItem href="/dashboard/onboarding" icon={<ClipboardList size={18} />} label={t("nav.onboarding")} active={pathname === "/dashboard/onboarding"} />

            <div className="mt-8">
              <p className="px-4 text-[10px] font-bold app-muted uppercase tracking-widest mb-2">
                {t("section.communication")}
              </p>
              <NavItem
                href="/dashboard/announcements"
                icon={<Megaphone size={18} />}
                label={t("nav.inbox")}
                active={pathname === "/dashboard/announcements"}
                badge={unreadCount > 0 ? unreadCount : undefined}
              />
            </div>

            {isRole(["ADMIN", "HR"]) && (
              <div className="mt-8">
                <p className="px-4 text-[10px] font-bold app-muted uppercase tracking-widest mb-2">
                  {t("section.management")}
                </p>
                <NavItem href="/dashboard/users" icon={<Users size={18} />} label={t("nav.employees")} active={pathname === "/dashboard/users"} />
                <NavItem href="/dashboard/departments" icon={<Building2 size={18} />} label={t("nav.departments")} active={pathname === "/dashboard/departments"} />
                <NavItem href="/dashboard/recruitment" icon={<Briefcase size={18} />} label={t("nav.recruitment")} active={pathname === "/dashboard/recruitment"} />
                <NavItem href="/dashboard/assets" icon={<Laptop size={18} />} label={t("nav.assets")} active={pathname === "/dashboard/assets"} />
                <NavItem href="/dashboard/documents" icon={<FileText size={18} />} label={t("nav.documents")} active={pathname === "/dashboard/documents"} />
              </div>
            )}

            {isRole(["DIRECTOR"]) && (
              <div className="mt-8">
                <p className="px-4 text-[10px] font-bold app-muted uppercase tracking-widest mb-2">
                  {t("section.management")}
                </p>
                <NavItem href="/dashboard/documents" icon={<FileText size={18} />} label={t("nav.documents")} active={pathname === "/dashboard/documents"} />
              </div>
            )}

            {isRole(["ADMIN"]) && (
              <div className="mt-8">
                <p className="px-4 text-[10px] font-bold app-muted uppercase tracking-widest mb-2">
                  {t("section.system")}
                </p>
                <NavItem href="/dashboard/audit" icon={<History size={18} />} label={t("nav.auditLogs")} active={pathname === "/dashboard/audit"} />
                <NavItem href="/admin/dashboard" icon={<ShieldAlert size={18} />} label={t("nav.controlPanel")} active={pathname === "/admin/dashboard"} />
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-hover)] mb-4 app-theme-transition">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-white">
                <User size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.full_name || "Admin User"}</p>
                <p className="text-xs app-muted truncate">{user?.role || "Administrator"}</p>
              </div>
              <Link href="/dashboard/announcements" className="relative">
                <Bell size={18} className="app-muted hover:text-[var(--foreground)] transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 p-2 app-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">{t("common.logout")}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

const NavItem = ({
  href,
  icon,
  label,
  active = false,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) => (
  <Link
    href={href}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active
        ? "bg-[var(--accent)] text-white shadow-lg shadow-indigo-600/20"
        : "app-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
    }`}
  >
    {icon}
    <span className="text-sm font-medium flex-1">{label}</span>
    {badge !== undefined && (
      <span className="text-[11px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
        {badge > 9 ? "9+" : badge}
      </span>
    )}
  </Link>
);
