"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop, Plus, X, Search, User, CheckCircle, AlertCircle,
  Wrench, Archive, Pencil, Trash2, UserMinus, UserPlus, PackageOpen,
  RefreshCw, Filter,
} from "lucide-react";
import { Asset, AssetStatus } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import { AssetService } from "@/services/asset.service";

/* ─────────────────── helpers ─────────────────── */

const CATEGORIES = ["Laptop", "Phone", "Monitor", "Peripheral", "Software", "Vehicle", "Other"];
const STATUSES: AssetStatus[] = ["STOCK", "ASSIGNED", "REPAIR", "RETIRED"];

const statusConfig: Record<AssetStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  STOCK:    { label: "In Stock",  icon: <CheckCircle size={13} />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ASSIGNED: { label: "Assigned",  icon: <User size={13} />,        color: "text-indigo-400",  bg: "bg-indigo-500/10  border-indigo-500/20"  },
  REPAIR:   { label: "In Repair", icon: <Wrench size={13} />,      color: "text-amber-400",   bg: "bg-amber-500/10  border-amber-500/20"   },
  RETIRED:  { label: "Retired",   icon: <Archive size={13} />,     color: "text-slate-500",   bg: "bg-slate-500/10  border-slate-500/20"   },
};

const categoryColor: Record<string, string> = {
  Laptop:     "bg-blue-500/10 text-blue-400",
  Phone:      "bg-purple-500/10 text-purple-400",
  Monitor:    "bg-sky-500/10 text-sky-400",
  Peripheral: "bg-cyan-500/10 text-cyan-400",
  Software:   "bg-green-500/10 text-green-400",
  Vehicle:    "bg-orange-500/10 text-orange-400",
  Other:      "bg-slate-500/10 text-slate-400",
};

/* ─────────────────── sub-components ─────────────────── */

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}
const Modal: React.FC<ModalProps> = ({ onClose, children, title }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="app-surface rounded-2xl p-6 w-full max-w-lg border border-[var(--border)] shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="app-muted hover:text-[var(--foreground)] transition-colors">
          <X size={18} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}
const FormField: React.FC<FormFieldProps> = ({ label, children }) => (
  <div>
    <label className="block text-xs app-muted uppercase tracking-wider mb-1.5 font-semibold">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors";
const selectCls = `${inputCls} cursor-pointer`;

/* ─────────────────── main page ─────────────────── */

type ModalMode = "create" | "edit" | "assign" | "delete" | null;

interface Employee { id: number; full_name: string; email: string; role: string; }

export default function AssetsPage() {
  const { user } = useAuth();
  const isHROrAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Create / Edit form state
  const [form, setForm] = useState({ name: "", serial_number: "", category: CATEGORIES[0], status: "STOCK" as AssetStatus });
  // Assign form state
  const [assignUserId, setAssignUserId] = useState("");

  /* fetch assets */
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = isHROrAdmin
        ? await AssetService.getAll()
        : await AssetService.getMyAssets();
      setAssets(data);
    } catch {
      setError("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, [isHROrAdmin]);

  /* fetch employees for assign dropdown */
  const fetchEmployees = useCallback(async () => {
    if (!isHROrAdmin) return;
    try {
      const { default: axios } = await import("@/lib/axios");
      const res = await axios.get<Employee[]>("/admin/v1/users");
      setEmployees(res.data);
    } catch {
      // non-critical
    }
  }, [isHROrAdmin]);

  useEffect(() => { void fetchAssets(); void fetchEmployees(); }, [fetchAssets, fetchEmployees]);

  /* filtered list */
  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name.toLowerCase().includes(q) ||
      a.serial_number.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      (a.assigned_to?.full_name ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchCat = filterCategory === "ALL" || a.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  /* stat counts */
  const stats = {
    total:    assets.length,
    stock:    assets.filter(a => a.status === "STOCK").length,
    assigned: assets.filter(a => a.status === "ASSIGNED").length,
    repair:   assets.filter(a => a.status === "REPAIR").length,
  };

  /* ── open helpers ── */
  const openCreate = () => {
    setForm({ name: "", serial_number: "", category: CATEGORIES[0], status: "STOCK" });
    setFormError(""); setModal("create");
  };
  const openEdit = (a: Asset) => {
    setSelected(a);
    setForm({ name: a.name, serial_number: a.serial_number, category: a.category, status: a.status });
    setFormError(""); setModal("edit");
  };
  const openAssign = (a: Asset) => {
    setSelected(a);
    setAssignUserId(a.assigned_to_user_id?.toString() ?? "");
    setFormError(""); setModal("assign");
  };
  const openDelete = (a: Asset) => { setSelected(a); setModal("delete"); };
  const closeModal = () => { setModal(null); setSelected(null); };

  /* ── CRUD handlers ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      await AssetService.create(form);
      await fetchAssets(); closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create asset.");
    } finally { setSaving(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setSaving(true); setFormError("");
    try {
      await AssetService.update(selected.id, form);
      await fetchAssets(); closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update asset.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return; setSaving(true);
    try {
      await AssetService.delete(selected.id);
      await fetchAssets(); closeModal();
    } catch { setFormError("Failed to delete."); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selected) return; setSaving(true); setFormError("");
    try {
      await AssetService.assign(selected.id, Number(assignUserId));
      await fetchAssets(); closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to assign asset.");
    } finally { setSaving(false); }
  };

  const handleUnassign = async (a: Asset) => {
    try {
      await AssetService.unassign(a.id);
      await fetchAssets();
    } catch { /* silent */ }
  };

  /* ── render ── */
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Asset Management</h1>
            <p className="app-muted text-sm">Track, assign and manage company hardware &amp; software</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void fetchAssets()}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] app-muted hover:text-[var(--foreground)] transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            {isHROrAdmin && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20"
              >
                <Plus size={16} /> Add Asset
              </button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total",     value: stats.total,    color: "text-[var(--foreground)]" },
            { label: "In Stock",  value: stats.stock,    color: "text-emerald-400" },
            { label: "Assigned",  value: stats.assigned, color: "text-indigo-400" },
            { label: "In Repair", value: stats.repair,   color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="app-surface rounded-2xl p-5 border border-[var(--border)]">
              <p className="text-xs app-muted uppercase tracking-wider font-semibold mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-52">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 app-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, serial, category, employee…"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm placeholder:app-muted focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="app-muted" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            {(["ALL", ...STATUSES] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === s
                    ? "bg-indigo-600 text-white shadow"
                    : "app-muted hover:text-[var(--foreground)]"
                }`}
              >
                {s === "ALL" ? "All" : s === "STOCK" ? "Stock" : s === "REPAIR" ? "Repair" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="app-surface rounded-2xl border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Asset", "Category", "Serial Number", "Status", "Assigned To", isHROrAdmin ? "Actions" : ""].map(h => h && (
                  <th key={h} className="text-left py-4 px-5 text-xs font-semibold app-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center app-muted">
                  <RefreshCw size={24} className="mx-auto mb-3 animate-spin opacity-40" />
                  Loading assets…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center app-muted">
                  <PackageOpen size={32} className="mx-auto mb-3 opacity-30" />
                  No assets found
                </td></tr>
              ) : filtered.map((asset, idx) => {
                const sc = statusConfig[asset.status] ?? statusConfig.STOCK;
                return (
                  <motion.tr
                    key={asset.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    {/* Asset name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Laptop size={16} className="text-indigo-400" />
                        </div>
                        <span className="font-medium text-sm">{asset.name}</span>
                      </div>
                    </td>
                    {/* Category */}
                    <td className="py-4 px-5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColor[asset.category] ?? categoryColor.Other}`}>
                        {asset.category}
                      </span>
                    </td>
                    {/* Serial */}
                    <td className="py-4 px-5 app-muted text-sm font-mono">{asset.serial_number}</td>
                    {/* Status */}
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                        {sc.icon}{sc.label}
                      </span>
                    </td>
                    {/* Assigned to */}
                    <td className="py-4 px-5">
                      {asset.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <User size={13} className="text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">{asset.assigned_to.full_name}</p>
                            <p className="text-xs app-muted mt-0.5">{asset.assigned_to.role}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="app-muted text-sm">—</span>
                      )}
                    </td>
                    {/* Actions */}
                    {isHROrAdmin && (
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          <ActionBtn title="Edit" onClick={() => openEdit(asset)}>
                            <Pencil size={14} />
                          </ActionBtn>
                          {asset.status === "STOCK" && (
                            <ActionBtn title="Assign to employee" onClick={() => openAssign(asset)}>
                              <UserPlus size={14} />
                            </ActionBtn>
                          )}
                          {asset.status === "ASSIGNED" && (
                            <ActionBtn title="Unassign" onClick={() => void handleUnassign(asset)} className="text-amber-400 hover:bg-amber-500/10">
                              <UserMinus size={14} />
                            </ActionBtn>
                          )}
                          <ActionBtn title="Delete" onClick={() => openDelete(asset)} className="text-red-400 hover:bg-red-500/10">
                            <Trash2 size={14} />
                          </ActionBtn>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Create */}
        {modal === "create" && (
          <Modal title="Register New Asset" onClose={closeModal}>
            <AssetForm
              form={form} setForm={setForm}
              onSubmit={handleCreate} saving={saving}
              error={formError} submitLabel="Create Asset"
            />
          </Modal>
        )}

        {/* Edit */}
        {modal === "edit" && selected && (
          <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
            <AssetForm
              form={form} setForm={setForm}
              onSubmit={handleEdit} saving={saving}
              error={formError} submitLabel="Save Changes"
              showStatus
            />
          </Modal>
        )}

        {/* Assign */}
        {modal === "assign" && selected && (
          <Modal title={`Assign — ${selected.name}`} onClose={closeModal}>
            <form onSubmit={e => void handleAssign(e)} className="space-y-4">
              <FormField label="Select Employee">
                <select
                  required
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Choose employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} — {emp.role}
                    </option>
                  ))}
                </select>
              </FormField>
              {formError && <p className="text-red-400 text-xs">{formError}</p>}
              <SubmitBtn saving={saving} label="Assign Asset" />
            </form>
          </Modal>
        )}

        {/* Delete confirm */}
        {modal === "delete" && selected && (
          <Modal title="Confirm Delete" onClose={closeModal}>
            <div className="text-sm app-muted mb-6">
              Are you sure you want to permanently delete <span className="font-semibold text-[var(--foreground)]">{selected.name}</span>?
              This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] app-muted hover:text-[var(--foreground)] text-sm transition-all">
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── helpers inside file ─────────────────── */

function ActionBtn({ onClick, title, children, className = "app-muted hover:bg-[var(--surface-hover)]" }: {
  onClick: () => void; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${className}`}
    >
      {children}
    </button>
  );
}

function SubmitBtn({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all disabled:opacity-60"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

interface AssetFormState { name: string; serial_number: string; category: string; status: AssetStatus; }

function AssetForm({
  form, setForm, onSubmit, saving, error, submitLabel, showStatus = false,
}: {
  form: AssetFormState;
  setForm: React.Dispatch<React.SetStateAction<AssetFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
  submitLabel: string;
  showStatus?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label="Asset Name">
        <input
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. MacBook Pro 16&quot;"
          className={inputCls}
        />
      </FormField>
      <FormField label="Serial Number">
        <input
          required
          value={form.serial_number}
          onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
          placeholder="SN-XXXXXX"
          className={inputCls}
        />
      </FormField>
      <FormField label="Category">
        <select
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className={selectCls}
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </FormField>
      {showStatus && (
        <FormField label="Status">
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as AssetStatus }))}
            className={selectCls}
          >
            {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
          </select>
        </FormField>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <SubmitBtn saving={saving} label={submitLabel} />
    </form>
  );
}
