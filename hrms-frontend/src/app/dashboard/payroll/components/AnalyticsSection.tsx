"use client";

import React from "react";

interface StatusRow {
  status: string;
  label: string;
  count: number;
  amount: number;
}

interface MonthRow {
  month: number;
  monthLabel: string;
  count: number;
  amount: number;
}

interface AnalyticsSectionProps {
  t: (key: string, data?: Record<string, string | number>) => string;
  uiLocale: string;
  timezone: string;
  currency: string;
  byStatus: StatusRow[];
  monthlyTotals: MonthRow[];
  formatCurrency: (value: number) => string;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  t,
  uiLocale,
  timezone,
  currency,
  byStatus,
  monthlyTotals,
  formatCurrency,
}) => (
  <div className="app-surface rounded-2xl p-6 space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h3 className="text-xl font-semibold">{t("payroll.analytics.title")}</h3>
      <p className="text-xs app-muted">
        {t("payroll.analytics.meta", {
          locale: uiLocale,
          timezone,
          currency,
        })}
      </p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="app-surface-strong rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">{t("payroll.analytics.byStatus")}</h4>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider app-muted border-b border-(--border)">
                <th className="text-left py-2">{t("payroll.analytics.status")}</th>
                <th className="text-left py-2">{t("payroll.analytics.count")}</th>
                <th className="text-left py-2">{t("payroll.analytics.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {byStatus.map((row) => (
                <tr key={row.status} className="border-b border-(--border)/70 last:border-0">
                  <td className="py-2">{row.label}</td>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="app-surface-strong rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">{t("payroll.analytics.monthly")}</h4>
        <div className="space-y-2">
          {monthlyTotals.map((row) => (
            <div key={row.month} className="flex items-center justify-between gap-2 text-sm">
              <span className="capitalize app-muted">{row.monthLabel}</span>
              <span className="font-semibold">
                {formatCurrency(row.amount)} ({row.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
