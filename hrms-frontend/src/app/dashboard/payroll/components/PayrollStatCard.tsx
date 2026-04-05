"use client";

import React from "react";

interface PayrollStatCardProps {
  title: string;
  value: string;
  sub: string;
}

export const PayrollStatCard: React.FC<PayrollStatCardProps> = ({ title, value, sub }) => (
  <div className="app-surface rounded-3xl p-6 shadow-sm">
    <p className="app-muted text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
    <p className="text-3xl font-bold tracking-tight mb-2">{value}</p>
    <p className="text-xs text-indigo-500 font-medium">{sub}</p>
  </div>
);
