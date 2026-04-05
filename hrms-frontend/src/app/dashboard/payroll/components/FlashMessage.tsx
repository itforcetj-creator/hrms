"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FlashMessageProps {
  type: "success" | "error";
  text: string;
}

export const FlashMessage: React.FC<FlashMessageProps> = ({ type, text }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`p-4 rounded-2xl flex items-center gap-3 text-sm border font-medium ${
      type === "success"
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        : "bg-red-500/10 border-red-500/20 text-red-500"
    }`}
  >
    {type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
    {text}
  </motion.div>
);
