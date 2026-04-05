"use client";

import React, { useEffect, useState } from "react";
import { AdminService } from "@/services/admin.service";
import { UserProfile } from "@/types/auth";
import { Department, Position } from "@/types/hr";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, MoreVertical, Shield, Mail, Trash2, Edit2, X, Check } from "lucide-react";

const UsersPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "USER",
    department_id: 0,
    position_id: 0,
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, [search]);

  useEffect(() => {
    if (isModalOpen) {
      loadFormData();
    }
  }, [isModalOpen]);

  const fetchUsers = async () => {
    try {
      const data = await AdminService.getUsers({ search });
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [depts, pos] = await Promise.all([
        AdminService.getDepartments(),
        AdminService.getPositions()
      ]);
      setDepartments(depts);
      // If a department is selected in the form, filter positions
      if (formData.department_id > 0) {
        const filteredPos = pos.filter((p: Position) => p.department_id === formData.department_id);
        setPositions(filteredPos);
      } else {
        setPositions(pos);
      }
    } catch (error) {
      console.error("Failed to load form dependencies", error);
    }
  };

  const handleOpenModal = (user: UserProfile | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        password: "", // Don't show password
        role: user.role || "USER",
        department_id: user.department_id || 0,
        position_id: user.position_id || 0,
        is_active: user.is_active ?? true
      });
    } else {
      setEditingUser(null);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        role: "USER",
        department_id: 0,
        position_id: 0,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await AdminService.updateUser(editingUser.id, formData);
      } else {
        await AdminService.createUser(formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert("Failed to save employee data");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to permanently delete this employee? This action cannot be undone.")) {
      try {
        await AdminService.deleteUser(id);
        fetchUsers();
      } catch (error) {
        alert("Failed to delete user");
      }
    }
  };

  return (
    <div className="p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-white">Employee Management</h1>
          <p className="text-slate-400">View and manage your organization's workforce.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 font-medium"
        >
          <UserPlus size={18} />
          Add Employee
        </button>
      </div>

      <div className="bg-[#1e293b]/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-hidden focus:border-indigo-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic">Loading employees...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic">No employees found.</td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <motion.tr 
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 shadow-lg">
                          {u.full_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={12}/> {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Shield size={14} className="text-indigo-400" />
                        <span className="text-sm">{u.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <div>
                        <p className="font-medium text-slate-300">{u.department?.name || "No Dept"}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{u.position?.title || "No Pos"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenModal(u)}
                          className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Add/Edit User */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#1e293b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingUser ? "Edit Employee" : "Add New Employee"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {editingUser ? "New Password (Optional)" : "Password"}
                  </label>
                  <input 
                    required={!editingUser}
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                    <select 
                      value={formData.department_id}
                      onChange={async (e) => {
                        const deptId = Number(e.target.value);
                        setFormData({...formData, department_id: deptId, position_id: 0});
                        const allPos = await AdminService.getPositions();
                        if (deptId > 0) {
                          setPositions(allPos.filter((p: Position) => p.department_id === deptId));
                        } else {
                          setPositions(allPos);
                        }
                      }}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                    >
                      <option value={0} className="bg-[#1e293b]">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="bg-[#1e293b]">{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Position</label>
                    <select 
                      value={formData.position_id}
                      onChange={(e) => setFormData({...formData, position_id: Number(e.target.value)})}
                      className="w-full bg-[#1e293b] border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                    >
                      <option value={0} className="bg-[#1e293b]">Select Position</option>
                      {positions.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#1e293b]">{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                  >
                    <option value="USER" className="bg-[#1e293b]">Standard User</option>
                    <option value="HR" className="bg-[#1e293b]">HR Manager</option>
                    <option value="DEPARTMENT_HEAD" className="bg-[#1e293b]">Department Head</option>
                    <option value="ADMIN" className="bg-[#1e293b]">Administrator</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded-sm border-white/10 bg-white/5 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-300">Employee is currently active</label>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    {editingUser ? "Save Changes" : "Create Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersPage;
