"use client";

import React, { useEffect, useState } from "react";
import { AdminService } from "@/services/admin.service";
import { AuditLog } from "@/types/hr";
import { motion } from "framer-motion";
import { History, ShieldAlert, Monitor, User, Database, ChevronRight } from "lucide-react";

const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await AdminService.getAuditLogs();
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  const formatJSON = (val: string) => {
    try {
        if (!val) return "{}";
        const parsed = JSON.parse(val);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return val;
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <History size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">System Audit Logs</h1>
          <p className="text-slate-400 text-sm">Full transparency of mutation events and sensitive data modifications.</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
             <div className="p-20 text-center text-slate-500 italic bg-white/5 rounded-3xl border border-white/5">Retrieving system history...</div>
        ) : logs.length === 0 ? (
             <div className="p-20 text-center text-slate-500 italic bg-white/5 rounded-3xl border border-white/5">No activity recorded yet.</div>
        ) : (
            logs.map((log, idx) => (
                <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#1e293b]/40 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all group"
                >
                    <div className="p-5 flex items-center justify-between gap-4 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                <Database size={16} />
                            </div>
                            <div>
                                <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest">{log.table}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <h3 className="font-bold text-white uppercase text-sm tracking-tight">{log.action}</h3>
                                    <ChevronRight size={14} className="text-slate-700" />
                                    <span className="text-xs text-slate-400 italic">Record #{log.record_id}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{new Date(log.created_at).toLocaleString()}</p>
                             <div className="flex items-center justify-end gap-1.5 mt-1 text-emerald-400">
                                <Monitor size={12} />
                                <span className="text-[10px] font-mono">{log.ip_address}</span>
                             </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-3 text-slate-300">
                           <User size={14} className="text-indigo-400" />
                           <span className="text-xs font-medium">ActorID: {log.user_id}</span>
                           <span className="text-slate-600 px-2">•</span>
                           <span className="text-xs text-slate-400 italic max-w-lg truncate">{log.message}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Before Change</p>
                                <pre className="bg-[#0f172a] p-4 rounded-xl text-[10px] font-mono text-red-400/70 overflow-auto max-h-32 border border-red-500/10 shadow-inner">
                                    {formatJSON(log.old_values)}
                                </pre>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">After Change</p>
                                <pre className="bg-[#0f172a] p-4 rounded-xl text-[10px] font-mono text-emerald-400/80 overflow-auto max-h-32 border border-emerald-500/10 shadow-inner">
                                    {formatJSON(log.new_values)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))
        )}
      </div>

      <div className="mt-10 p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center gap-4">
        <ShieldAlert className="text-amber-500 shrink-0" size={24} />
        <p className="text-xs text-slate-400 leading-relaxed">
           Audit logs are immutable and permanent. Only global administrators can access this view for security compliance and incident investigation. 
           All encrypted data in these logs remains secure at the database level.
        </p>
      </div>
    </div>
  );
};

export default AuditLogsPage;
