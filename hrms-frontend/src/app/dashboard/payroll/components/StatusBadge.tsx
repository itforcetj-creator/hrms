"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => (
  <span
    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
      status === "PAID"
        ? "bg-emerald-500/10 text-emerald-500"
        : status === "PENDING"
          ? "bg-amber-500/10 text-amber-500"
          : "bg-red-500/10 text-red-500"
    }`}
  >
    {label}
  </span>
);
