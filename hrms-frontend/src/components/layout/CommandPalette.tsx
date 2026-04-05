"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Briefcase, FileText, Settings, X, Terminal, Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin.service";
import { RecruitmentService } from "@/services/recruitment.service";
import { UserProfile } from "@/types/auth";
import { RecruitmentJob } from "@/types/hr";

interface SearchResult {
  id: string | number;
  type: "user" | "job" | "page";
  title: string;
  subtitle?: string;
  link: string;
  icon: React.ReactNode;
}

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const staticPages: SearchResult[] = [
    { id: "p1", type: "page", title: "Dashboard Overview", subtitle: "Main analytics & stats", link: "/dashboard", icon: <Terminal size={18} /> },
    { id: "p2", type: "page", title: "My Profile", subtitle: "Personal settings", link: "/dashboard/profile", icon: <User size={18} /> },
    { id: "p3", type: "page", title: "Recruitment", subtitle: "Hiring & ATS", link: "/dashboard/recruitment", icon: <Briefcase size={18} /> },
    { id: "p4", type: "page", title: "Audit Logs", subtitle: "System events", link: "/dashboard/audit", icon: <FileText size={18} /> },
    { id: "p5", type: "page", title: "Payroll", subtitle: "Salary & Payslips", link: "/dashboard/payroll", icon: <Settings size={18} /> },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setResults(staticPages);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults(staticPages);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Search for users and jobs
        const [users, jobs] = await Promise.all([
          AdminService.getUsers({ search: query }),
          RecruitmentService.getJobs({ search: query }),
        ]);

        const mappedUsers: SearchResult[] = (users || []).map((u: UserProfile) => ({
          id: `u-${u.id}`,
          type: "user",
          title: u.full_name,
          subtitle: `Employee • ${u.role}`,
          link: `/dashboard/users/${u.id}`,
          icon: <User size={18} className="text-indigo-400" />,
        }));

        const mappedJobs: SearchResult[] = (jobs || []).map((j: RecruitmentJob) => ({
          id: `j-${j.id}`,
          type: "job",
          title: j.title,
          subtitle: `Recruitment • ${j.status}`,
          link: `/dashboard/recruitment?jobId=${j.id}`, // We can handle this in the page
          icon: <Briefcase size={18} className="text-emerald-400" />,
        }));

        const filteredPages = staticPages.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));

        setResults([...filteredPages, ...mappedUsers, ...mappedJobs].slice(0, 10));
        setSelectedIndex(0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.link);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      if (results[selectedIndex]) handleSelect(results[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-xl bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center px-4 py-4 border-b border-white/10">
              <Search className="text-slate-500 mr-3" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything... (Cmd+K)"
                className="flex-1 bg-transparent text-white border-none focus:ring-0 placeholder-slate-500 text-lg outline-hidden"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                 <Command size={10} className="text-slate-500" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase">K</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading && results.length === 0 ? (
                <div className="p-10 text-center text-slate-500">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-10 text-center text-slate-500">No results found for "{query}"</div>
              ) : (
                results.map((res, index) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelect(res)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedIndex === index ? "bg-indigo-600 shadow-lg shadow-indigo-600/20" : "hover:bg-white/5"
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${selectedIndex === index ? "bg-white/20" : "bg-white/5 border border-white/5"}`}>
                      {res.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${selectedIndex === index ? "text-white" : "text-white/90"}`}>{res.title}</p>
                      {res.subtitle && <p className={`text-xs truncate ${selectedIndex === index ? "text-indigo-100" : "text-slate-500"}`}>{res.subtitle}</p>}
                    </div>
                    {selectedIndex === index && <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Enter</span>}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white/2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10">↑↓</span>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10">Enter</span>
                    <span>Select</span>
                  </div>
               </div>
               <span>ESC to close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
