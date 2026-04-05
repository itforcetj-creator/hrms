"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { ProfileService } from "@/services/profile.service";
import { LeaveService, UserService, DocumentService, LeaveRequestPayload } from "@/services/hr.service";
import { LeaveRequest, HRDocument, Attendance, Payslip } from "@/types/hr";
import { UserProfile } from "@/types/auth";
import { CalendarDays, Clock, FileText, CreditCard, User, LogOut, CheckCircle2, XCircle, AlertCircle, Download, Trash2, UploadCloud, Plus, Edit2, X, Check } from "lucide-react";
import LeaveRequestModal from "@/components/profile/LeaveRequestModal";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "leave" | "documents" | "attendance" | "payroll" | "personal";

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("leave");
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: "",
    address: "",
    birth_place: ""
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [fetchedLeaves, fetchedDocs, fetchedAttendance, fetchedPayslips] = await Promise.all([
        ProfileService.getLeaves(),
        ProfileService.getDocuments(),
        ProfileService.getAttendance(),
        ProfileService.getPayslips(),
      ]);
      setLeaves(fetchedLeaves);
      setDocuments(fetchedDocs);
      setAttendance(fetchedAttendance);
      setPayslips(fetchedPayslips);

      // Fetch extended profile if we have user ID
      if (authUser?.id) {
        const fullProfile = await UserService.getProfile(authUser.id);
        setUserProfile(fullProfile);
        setEditForm({
          phone: fullProfile.phone || "",
          address: fullProfile.address || "",
          birth_place: fullProfile.birth_place || ""
        });
      }
    } catch (err) {
      console.error("Failed to load profile data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ProfileService.updateMe(editForm);
      setIsEditModalOpen(false);
      fetchProfileData();
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile.");
    }
  };

  const handleLeaveSubmit = async (data: LeaveRequestPayload) => {
    await LeaveService.request(data);
    const updatedLeaves = await ProfileService.getLeaves();
    setLeaves(updatedLeaves);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await ProfileService.uploadDocument(file, "PERSONAL");
      const updatedDocs = await ProfileService.getDocuments();
      setDocuments(updatedDocs);
    } catch (err) {
      console.error("Failed to upload document", err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await ProfileService.deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      console.error("Failed to delete document", err);
      alert("Failed to delete document. You might not have permission to delete official HR documents.");
    }
  };

  const downloadDocument = async (id: number, filename: string) => {
    try {
      const blob = await DocumentService.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download document", err);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "APPROVED": case "PRESENT": case "PAID": return "text-emerald-500 bg-emerald-500/10";
      case "REJECTED": case "ABSENT": case "CANCELLED": return "text-red-500 bg-red-500/10";
      case "PENDING": case "LATE": return "text-yellow-500 bg-yellow-500/10";
      default: return "text-indigo-500 bg-indigo-500/10";
    }
  };

  const renderPersonalTask = (label: string, value?: string | null) => (
    <div className="p-4 bg-(--surface-hover) rounded-2xl border border-(--border) overflow-hidden">
      <span className="text-[10px] app-muted uppercase font-bold tracking-wider block mb-1">{label}</span>
      <span className="text-sm font-semibold truncate block">{value || "Not Set"}</span>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-(--foreground) opacity-70 mt-1">Manage your employment details and self-service tools</p>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-6 items-center md:items-start">
        <div className="w-24 h-24 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-lg font-bold text-3xl text-white">
          {userProfile?.full_name?.charAt(0) || authUser?.full_name?.charAt(0) || "U"}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold">{userProfile?.full_name || authUser?.full_name || "Employee Name"}</h2>
          <p className="app-muted mb-4">{userProfile?.position?.title || authUser?.position?.title || "Position Title"} • {userProfile?.department?.name || authUser?.department?.name || "Department"}</p>
          
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
             <div className="px-4 py-2 bg-(--surface-hover) rounded-xl border border-(--border)">
                <span className="text-xs app-muted uppercase font-bold block mb-1">Email ID</span>
                <span className="text-sm font-medium">{userProfile?.email || authUser?.email || "email@company.com"}</span>
             </div>
             <div className="px-4 py-2 bg-(--surface-hover) rounded-xl border border-(--border)">
                <span className="text-xs app-muted uppercase font-bold block mb-1">Leave Balance</span>
                <span className="text-sm font-medium">{userProfile?.leave_balance ?? authUser?.leave_balance ?? "20"} Days</span>
             </div>
             <div className="px-4 py-2 bg-(--surface-hover) rounded-xl border border-(--border)">
                <span className="text-xs app-muted uppercase font-bold block mb-1">Role</span>
                <span className="text-sm font-medium bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-md">{userProfile?.role || authUser?.role || "USER"}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b border-(--border) overflow-x-auto custom-scrollbar pb-px">
        {[
          { id: "leave", icon: CalendarDays, label: "Leave & Vacation" },
          { id: "documents", icon: FileText, label: "My Documents" },
          { id: "attendance", icon: Clock, label: "Attendance Log" },
          { id: "payroll", icon: CreditCard, label: "Payslips" },
          { id: "personal", icon: User, label: "Personal Details" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-500"
                : "border-transparent app-muted hover:text-(--foreground) hover:border-(--border)"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "leave" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Leave Requests History</h3>
                  <button 
                    onClick={() => setShowLeaveModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                  >
                    <Plus size={16} /> Request Vacation
                  </button>
                </div>
                {leaves.length === 0 ? (
                  <div className="text-center p-12 bg-(--surface) rounded-2xl border border-(--border)">
                    <CalendarDays className="mx-auto h-12 w-12 app-muted mb-3" />
                    <h3 className="text-lg font-bold">No leave requests</h3>
                    <p className="app-muted text-sm mt-1">You haven't made any leave requests yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leaves.map(req => (
                      <div key={req.id} className="bg-(--surface) p-5 rounded-2xl border border-(--border) hover:border-indigo-500/30 transition-all shadow-xs">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-sm font-bold block">{req.type}</span>
                            <span className="text-xs app-muted">{req.days} Days Total</span>
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="text-sm mb-3">
                          <span className="app-muted">From:</span> {formatDate(req.start_date)}<br/>
                          <span className="app-muted">To:</span> {formatDate(req.end_date)}
                        </div>
                        <p className="text-xs app-muted line-clamp-2 bg-(--surface-hover) p-3 rounded-xl italic">"{req.reason}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">My Personal Documents & Contracts</h3>
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-(--surface) border border-(--border) px-4 py-2 rounded-xl text-sm font-medium hover:bg-(--surface-hover) transition"
                    >
                      <UploadCloud size={16} /> Upload Document
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.map(doc => {
                    const isOfficial = doc.is_contract || doc.uploaded_by_role === 'HR' || doc.uploaded_by_role === 'ADMIN';
                    return (
                      <div key={doc.id} className="bg-(--surface) rounded-2xl border border-(--border) overflow-hidden flex flex-col hover:-translate-y-1 transition-transform shadow-xs">
                        <div className={`p-4 border-b border-(--border) flex items-center justify-between ${isOfficial ? "bg-indigo-500/5" : "bg-(--surface-hover)"}`}>
                          <div className="flex items-center gap-2">
                            <FileText size={18} className={isOfficial ? "text-indigo-500" : "app-muted"} />
                            <span className="text-sm font-bold truncate max-w-[150px]" title={doc.file_name}>{doc.file_name}</span>
                          </div>
                          {isOfficial && (
                             <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-500">Official</span>
                          )}
                        </div>
                        <div className="p-4 flex-1">
                          <p className="text-xs app-muted mb-2">Type: <span className="font-medium text-(--foreground)">{doc.file_type || "Unknown"}</span></p>
                          <p className="text-xs app-muted">Uploaded: {formatDate(doc.created_at)}</p>
                        </div>
                        <div className="p-4 pt-0 flex gap-2">
                          <button 
                            onClick={() => downloadDocument(doc.id, doc.file_name)}
                            className="flex-1 flex items-center justify-center gap-2 text-xs font-medium bg-indigo-500/10 text-indigo-500 py-2 rounded-lg hover:bg-indigo-500/20 transition-colors"
                          >
                            <Download size={14} /> Download
                          </button>
                          {!isOfficial && (
                            <button 
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="flex items-center justify-center text-xs font-medium bg-red-500/10 text-red-500 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                              title="Delete Personal Document"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {documents.length === 0 && (
                     <div className="col-span-full text-center p-12 border border-dashed border-(--border) rounded-2xl">
                        <FileText className="mx-auto h-12 w-12 app-muted opacity-50 mb-3" />
                        <p className="app-muted font-medium">No documents uploaded yet</p>
                      </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold">Attendance History</h3>
                <div className="bg-(--surface) border border-(--border) rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-(--surface-hover) border-b border-(--border) select-none">
                      <tr>
                        <th className="p-4 font-bold">Date</th>
                        <th className="p-4 font-bold">Clock In</th>
                        <th className="p-4 font-bold">Clock Out</th>
                        <th className="p-4 font-bold">Total Hours</th>
                        <th className="p-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border)">
                      {attendance.map(record => (
                        <tr key={record.id} className="hover:bg-(--surface-hover)/50 transition-colors">
                          <td className="p-4 font-medium">{formatDate(record.date)}</td>
                          <td className="p-4 app-muted">{record.clock_in ? new Date(record.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                          <td className="p-4 app-muted">{record.clock_out ? new Date(record.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                          <td className="p-4 font-medium">{record.total_hours.toFixed(1)}h</td>
                          <td className="p-4">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {attendance.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center app-muted italic">No attendance records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "payroll" && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold">My Payslips</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {payslips.map(ps => (
                    <div key={ps.id} className="bg-(--surface) border border-(--border) rounded-2xl p-5 hover:border-indigo-500/30 transition-colors shadow-xs">
                      <div className="flex justify-between items-center mb-4">
                        <div className="w-10 h-10 rounded-xl bg-(--surface-hover) flex items-center justify-center">
                          <CreditCard className="text-emerald-500" size={20} />
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${getStatusColor(ps.status)}`}>
                          {ps.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">{ps.month}/{ps.year}</h4>
                      <p className="text-2xl font-black bg-linear-to-r from-emerald-400 to-indigo-500 bg-clip-text text-transparent mb-4">
                        ${ps.net_amount.toLocaleString()}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="app-muted">Bonuses:</span>
                          <span className="text-emerald-500 font-bold">+${ps.bonus_amount?.toLocaleString() || "0"}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="app-muted">Penalties:</span>
                          <span className="text-red-500 font-bold">-${ps.penalty_amount?.toLocaleString() || "0"}</span>
                        </div>
                      </div>

                      <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-(--border) hover:bg-(--surface-hover) text-sm font-medium transition cursor-not-allowed opacity-50">
                        <Download size={16} /> PDF Soon
                      </button>
                    </div>
                  ))}
                  {payslips.length === 0 && (
                     <div className="col-span-full text-center p-12 border border-dashed border-(--border) rounded-2xl">
                        <CreditCard className="mx-auto h-12 w-12 app-muted opacity-50 mb-3" />
                        <p className="app-muted font-medium">No payslips available</p>
                      </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "personal" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Personal Identification Data</h3>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500/20 transition-all"
                  >
                    <Edit2 size={16} /> Edit Details
                  </button>
                </div>
                
                <div className="bg-(--surface) border border-(--border) rounded-2xl p-6 shadow-xs">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {renderPersonalTask("Passport Series", userProfile?.passport_series)}
                      {renderPersonalTask("Passport Number", userProfile?.passport_number)}
                      {renderPersonalTask("Issued By", userProfile?.passport_issued_by)}
                      {renderPersonalTask("Issued Date", formatDate(userProfile?.passport_issued_date))}
                      {renderPersonalTask("Birth Date", formatDate(userProfile?.birth_date))}
                      {renderPersonalTask("Birth Place", userProfile?.birth_place)}
                      {renderPersonalTask("INN", userProfile?.inn)}
                      {renderPersonalTask("SNILS", userProfile?.snils)}
                      {renderPersonalTask("Phone", userProfile?.phone)}
                      {renderPersonalTask("Address", userProfile?.address)}
                   </div>
                   
                   <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                      <AlertCircle className="text-amber-500 shrink-0" size={20} />
                      <p className="text-sm app-muted leading-relaxed">
                        To update your official identification information, please contact the <span className="font-bold text-amber-500">HR department</span>. Document verification is required for all changes to identification data.
                      </p>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showLeaveModal && (
        <LeaveRequestModal 
          onClose={() => setShowLeaveModal(false)}
          onSubmit={handleLeaveSubmit}
        />
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#1e293b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit2 size={20} className="text-indigo-400" />
                  Edit Personal Details
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Address</label>
                  <textarea 
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-hidden focus:border-indigo-500/50 min-h-[80px]"
                    placeholder="123 Street Name, City, Country"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Birth Place</label>
                  <input 
                    type="text" 
                    value={editForm.birth_place}
                    onChange={(e) => setEditForm({...editForm, birth_place: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:outline-hidden focus:border-indigo-500/50"
                    placeholder="City, Country"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Update Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
