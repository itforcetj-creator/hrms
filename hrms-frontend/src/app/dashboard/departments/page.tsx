"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Search, Users, X, Mail, UserRound, Pencil } from "lucide-react";
import { DepartmentSummary } from "@/types/hr";
import { DepartmentService } from "@/services/department.service";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/auth";
import { AdminService } from "@/services/admin.service";

const DepartmentsPage = () => {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "HR";

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentSummary | null>(null);
  const [editManagerId, setEditManagerId] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentSummary | null>(null);
  const [departmentUsers, setDepartmentUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const loadDepartmentsAndManagers = useCallback(async () => {
    try {
      const [departmentsData, managersData] = await Promise.all([
        DepartmentService.getAll(),
        canManage ? AdminService.getUsers({ role: "DEPARTMENT_HEAD" }) : Promise.resolve([]),
      ]);
      setDepartments(departmentsData || []);
      setManagers(managersData || []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
      setDepartments([]);
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    loadDepartmentsAndManagers();
  }, [loadDepartmentsAndManagers]);

  const managerNameById = useMemo(
    () => new Map(managers.map((manager) => [manager.id, manager.full_name])),
    [managers]
  );

  const getDepartmentManagerLabel = useCallback(
    (department: DepartmentSummary) => {
      if (department.manager?.full_name) return department.manager.full_name;
      if (department.manager_id) return managerNameById.get(department.manager_id) || `ID: ${department.manager_id}`;
      return "Not assigned";
    },
    [managerNameById]
  );

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter(
      (department) =>
        department.name.toLowerCase().includes(term) ||
        String(department.id).includes(term) ||
        getDepartmentManagerLabel(department).toLowerCase().includes(term) ||
        String(department.manager_id || "").includes(term)
    );
  }, [departments, search, getDepartmentManagerLabel]);

  const openCreateModal = () => {
    setName("");
    setManagerId("");
    setFormError("");
    setShowCreateModal(true);
  };

  const openEditModal = (department: DepartmentSummary) => {
    setEditingDepartment(department);
    setEditManagerId(department.manager_id ? String(department.manager_id) : "");
    setEditFormError("");
    setShowEditModal(true);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Department name is required.");
      return;
    }

    const parsedManagerId = managerId.trim() ? Number(managerId) : undefined;
    if (parsedManagerId !== undefined && (!Number.isFinite(parsedManagerId) || parsedManagerId <= 0)) {
      setFormError("Please select a valid manager.");
      return;
    }
    if (parsedManagerId !== undefined && !managers.some((m) => m.id === parsedManagerId)) {
      setFormError("Selected manager is not valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await DepartmentService.create({
        name: trimmedName,
        manager_id: parsedManagerId,
      });
      setDepartments((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      );
      setShowCreateModal(false);
      setName("");
      setManagerId("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response: { data: { error: string } } }).response.data.error
          : "Failed to create department.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartmentHead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDepartment) return;
    setEditFormError("");

    const trimmed = editManagerId.trim();
    const parsedManagerId = trimmed ? Number(trimmed) : null;

    if (parsedManagerId !== null && (!Number.isFinite(parsedManagerId) || parsedManagerId <= 0)) {
      setEditFormError("Please select a valid manager.");
      return;
    }
    if (parsedManagerId !== null && !managers.some((m) => m.id === parsedManagerId)) {
      setEditFormError("Selected manager is not valid.");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const updated = await DepartmentService.update(editingDepartment.id, {
        manager_id: parsedManagerId,
      });
      setDepartments((prev) =>
        prev
          .map((department) => (department.id === updated.id ? updated : department))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      );
      setShowEditModal(false);
      setEditingDepartment(null);
      setEditManagerId("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response: { data: { error: string } } }).response.data.error
          : "Failed to update department manager.";
      setEditFormError(message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const openDepartmentUsers = async (department: DepartmentSummary) => {
    setSelectedDepartment(department);
    setDepartmentUsers([]);
    setUsersError("");
    setUsersLoading(true);

    try {
      const users = await AdminService.getUsers({ department: String(department.id) });
      setDepartmentUsers(users || []);
    } catch (error) {
      console.error("Failed to fetch department users", error);
      setUsersError("Failed to load users for this department.");
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Department Management</h1>
          <p className="app-muted">Create and organize company departments.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg font-medium"
          >
            <Plus size={18} />
            Add Department
          </button>
        )}
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 app-muted" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, id, manager..."
          className="w-full app-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
        />
      </div>

      <div className="app-surface rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center app-muted italic">Loading departments...</div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-16 text-center app-muted italic">No departments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
                <tr className="text-left text-xs uppercase tracking-wider app-muted">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Members</th>
                  {canManage && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department, idx) => (
                  <motion.tr
                    key={department.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]/50 transition-colors cursor-pointer"
                    onClick={() => openDepartmentUsers(department)}
                  >
                    <td className="px-6 py-4 text-sm font-mono app-muted">#{department.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 inline-flex items-center justify-center">
                          <Building2 size={16} />
                        </div>
                        <span className="font-semibold">{department.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm app-muted">
                      {getDepartmentManagerLabel(department)}
                    </td>
                    <td className="px-6 py-4 text-sm app-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} />
                        N/A
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(department);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-xs font-medium"
                        >
                          <Pencil size={14} />
                          Edit Head
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateDepartment} className="app-surface-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Department</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">Department Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Finance"
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">Manager (Optional)</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.email})
                    </option>
                  ))}
                </select>
                {canManage && managers.length === 0 && (
                  <p className="text-xs app-muted mt-1">No users with manager role found.</p>
                )}
              </div>

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Department"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showEditModal && editingDepartment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditDepartmentHead} className="app-surface-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Edit Department Head</h2>
                <p className="text-sm app-muted mt-1">{editingDepartment.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingDepartment(null);
                }}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">Department Head</label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} ({manager.email})
                    </option>
                  ))}
                </select>
                {canManage && managers.length === 0 && (
                  <p className="text-xs app-muted mt-1">No users with manager role found.</p>
                )}
              </div>

              {editFormError && <p className="text-sm text-red-500">{editFormError}</p>}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDepartment(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {selectedDepartment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-surface-strong rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{selectedDepartment.name} Members</h2>
                <p className="text-sm app-muted mt-1">Department #{selectedDepartment.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDepartment(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {usersLoading ? (
              <div className="py-10 text-center app-muted italic">Loading users...</div>
            ) : usersError ? (
              <div className="py-8 text-center text-red-500">{usersError}</div>
            ) : departmentUsers.length === 0 ? (
              <div className="py-10 text-center app-muted italic">No users in this department.</div>
            ) : (
              <div className="space-y-3">
                {departmentUsers.map((member) => (
                  <div
                    key={member.id}
                    className="app-surface rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        <UserRound size={15} className="text-indigo-500" />
                        {member.full_name}
                      </p>
                      <p className="text-sm app-muted flex items-center gap-1.5 mt-1">
                        <Mail size={14} />
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                        {member.role}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          member.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 app-muted"
                        }`}
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;
