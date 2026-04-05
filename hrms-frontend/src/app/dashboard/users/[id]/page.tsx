"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, Download, Eye, FileText, Mail, Shield, Upload, UserCircle2 } from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { DocumentService, UserService } from "@/services/hr.service";
import { UserProfile } from "@/types/auth";
import { HRDocument } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";

const DOCUMENT_TYPES = ["CONTRACT", "LEGAL", "IDENTITY", "CERTIFICATE", "POLICY", "OTHER"] as const;
type EmployeeWithDocuments = UserProfile & { documents?: HRDocument[] };

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const employeeId = useMemo(() => Number(params?.id), [params]);
  const canManageDocuments = user?.role === "ADMIN" || user?.role === "HR";
  const canViewManagedDocs = canManageDocuments;
  const canUseManagedDownload = canManageDocuments;
  const canUploadManagedDocs = canManageDocuments;

  const [employee, setEmployee] = useState<EmployeeWithDocuments | null>(null);
  const [documents, setDocuments] = useState<HRDocument[]>([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [pageError, setPageError] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]>("CONTRACT");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadEmployee = useCallback(async () => {
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      setPageError("Invalid employee id.");
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setPageError("");
    try {
      const data = (await AdminService.getUserById(employeeId)) as EmployeeWithDocuments;
      setEmployee(data);
      if (Array.isArray(data.documents) && data.documents.length > 0) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to load employee profile", error);
      setPageError("Failed to load employee profile.");
      setEmployee(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [employeeId]);

  const loadDocuments = useCallback(async () => {
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      setLoadingDocuments(false);
      return;
    }

    setLoadingDocuments(true);
    try {
      if (canViewManagedDocs) {
        const data = await DocumentService.getAllByUsers({ user_id: employeeId });
        if (Array.isArray(data) && data.length > 0) {
          setDocuments(data);
        } else if (Array.isArray(employee?.documents)) {
          setDocuments(employee.documents);
        } else {
          setDocuments([]);
        }
      } else if (user?.id === employeeId) {
        const data = await DocumentService.getMyDocuments();
        setDocuments((data || []).filter((d) => d.user_id === employeeId));
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error("Failed to load user documents", error);
      if (Array.isArray(employee?.documents)) {
        setDocuments(employee.documents);
      } else {
        setDocuments([]);
      }
    } finally {
      setLoadingDocuments(false);
    }
  }, [canViewManagedDocs, employee?.documents, employeeId, user?.id]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUploadManagedDocs) return;
    if (!selectedFile) {
      setUploadError("Please choose a file first.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("document_type", documentType);
      formData.append("user_id", String(employeeId));
      await DocumentService.upload(formData);
      setUploadSuccess("Document uploaded successfully.");
      setSelectedFile(null);
      await loadDocuments();
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
          ? (error as { response: { data: { error: string } } }).response.data.error
          : "Failed to upload document.";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: HRDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = canUseManagedDownload
        ? await DocumentService.downloadManaged(doc.id)
        : await DocumentService.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || `document-${doc.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download document", error);
      setPageError("Failed to download selected document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadContract = async () => {
    if (!employeeId) return;
    setDownloadingId(-1); // Use -1 as a special ID for contract
    try {
      const blob = await UserService.downloadContract(employeeId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Contract_${employee?.full_name || 'Employee'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download contract", error);
      setPageError("Failed to generate employment contract.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/users"
            className="mb-3 inline-flex items-center gap-2 text-sm app-muted hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to employee list
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">Employee Profile</h1>
          <p className="text-slate-400 mt-1">View personal details and employee documents.</p>
        </div>
        {(user?.role === "ADMIN" || user?.role === "HR") && (
          <button
            onClick={handleDownloadContract}
            disabled={downloadingId === -1}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 font-medium disabled:opacity-60"
          >
            <Download size={18} />
            {downloadingId === -1 ? "Generating..." : "Generate Contract"}
          </button>
        )}
      </div>

      {pageError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {pageError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#1e293b]/50 p-6">
          {loadingProfile ? (
            <p className="text-slate-400 italic">Loading employee profile...</p>
          ) : !employee ? (
            <p className="text-slate-400 italic">Employee not found.</p>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/15 text-indigo-300 inline-flex items-center justify-center">
                  <UserCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{employee.full_name}</h2>
                  <p className="text-sm text-slate-400">Employee ID #{employee.id}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail size={15} className="text-indigo-300" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Shield size={15} className="text-indigo-300" />
                  <span>Role: {employee.role}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 size={15} className="text-indigo-300" />
                  <span>Department: {employee.department?.name || "Not assigned"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Briefcase size={15} className="text-indigo-300" />
                  <span>Position: {employee.position?.title || "Not assigned"}</span>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      employee.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${employee.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                    {employee.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Passport & Identity Section */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Passport & Identity</h3>
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Passport</p>
                      <p className="text-slate-200">{employee.passport_series} {employee.passport_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Issued By / Date</p>
                      <p className="text-slate-200">
                        {employee.passport_issued_by || "-"} 
                        {employee.passport_issued_date && ` / ${new Date(employee.passport_issued_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold">INN</p>
                        <p className="text-slate-200">{employee.inn || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold">SNILS</p>
                        <p className="text-slate-200">{employee.snils || "-"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Birth Date</p>
                        <p className="text-slate-200">
                          {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Birth Place</p>
                        <p className="text-slate-200">{employee.birth_place || "-"}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Contact & Address</p>
                      <p className="text-slate-200">{employee.phone || "No phone"}</p>
                      <p className="text-xs text-slate-400 italic">{employee.address || "No address provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="lg:col-span-3 rounded-2xl border border-white/10 bg-[#1e293b]/50 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">Employee Documents</h3>
              <p className="text-sm text-slate-400">Upload and manage files attached to this employee.</p>
            </div>
          </div>

          {canUploadManagedDocs && (
            <form onSubmit={handleUpload} className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as (typeof DOCUMENT_TYPES)[number])}
                  className="app-input rounded-xl px-4 py-2.5 text-sm"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="app-input rounded-xl px-3 py-2 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-500 file:text-xs file:font-medium"
                  required
                />

                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 transition-colors disabled:opacity-60"
                >
                  <Upload size={15} />
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {uploadError && <p className="mt-2 text-sm text-red-400">{uploadError}</p>}
              {uploadSuccess && <p className="mt-2 text-sm text-emerald-400">{uploadSuccess}</p>}
            </form>
          )}

          {loadingDocuments ? (
            <p className="text-slate-400 italic">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-400 italic">
              No documents uploaded for this employee.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate flex items-center gap-2">
                      <FileText size={16} className="text-indigo-300 shrink-0" />
                      <span className="truncate">{doc.file_name}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(doc.file_type || "UNSPECIFIED").toUpperCase()} | {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/document-preview/${doc.id}?name=${encodeURIComponent(doc.file_name || "")}&managed=${canUseManagedDownload ? "1" : "0"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      <Eye size={14} />
                      Preview
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-60"
                    >
                      <Download size={14} />
                      {downloadingId === doc.id ? "Downloading..." : "Download"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
