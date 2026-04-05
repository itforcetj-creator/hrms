"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Upload, Search, ShieldCheck, X, Eye } from "lucide-react";
import { DocumentService } from "@/services/hr.service";
import { HRDocument } from "@/types/hr";
import { useAuth } from "@/context/AuthContext";
import { AdminService } from "@/services/admin.service";
import { UserProfile } from "@/types/auth";

const DocumentsPage = () => {
  const { user } = useAuth();
  const canViewAll = user?.role === "ADMIN" || user?.role === "HR" || user?.role === "DIRECTOR";
  const canUseManagedDownload = user?.role === "ADMIN" || user?.role === "HR";
  const canUpload =
    user?.role === "ADMIN" ||
    user?.role === "HR" ||
    user?.role === "USER" ||
    user?.role === "DEPARTMENT_HEAD";

  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("CONTRACT");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    if (!canViewAll) return;

    setUsersLoading(true);
    try {
      const data = await AdminService.getUsers();
      setUsers(data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [canViewAll]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = canViewAll
        ? await DocumentService.getAllByUsers({
            user_id: selectedUserId ? Number(selectedUserId) : undefined,
          })
        : await DocumentService.getMyDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch documents", error);
      setDocuments([]);
      setLoadError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [canViewAll, selectedUserId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) =>
        doc.file_name.toLowerCase().includes(term) ||
        (doc.file_type || "").toLowerCase().includes(term) ||
        String(doc.id).includes(term) ||
        (doc.user?.full_name || "").toLowerCase().includes(term) ||
        (doc.user?.email || "").toLowerCase().includes(term) ||
        String(doc.user_id).includes(term)
    );
  }, [documents, search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");
    setUploadSuccess("");

    if (!selectedFile) {
      setUploadError("Please choose a file.");
      return;
    }

    setUploading(true);
    try {
      const result = await DocumentService.upload(selectedFile, documentType);
      if (canViewAll) {
        await loadDocuments();
      } else if (result?.document) {
        setDocuments((prev) => [result.document, ...prev]);
      } else {
        await loadDocuments();
      }
      setUploadSuccess("Document uploaded successfully.");
      setShowUploadModal(false);
      setSelectedFile(null);
      setDocumentType("CONTRACT");
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
      setLoadError("Failed to download selected document.");
    } finally {
      setDownloadingId(null);
    }
  };

  const openUploadModal = () => {
    setUploadError("");
    setUploadSuccess("");
    setSelectedFile(null);
    setDocumentType("CONTRACT");
    setShowUploadModal(true);
  };

  return (
    <div className="p-10">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Document Vault</h1>
          <p className="app-muted">
            {canViewAll
              ? "View documents by employees and departments."
              : "Upload and download your employment and legal documents securely."}
          </p>
        </div>
        {canUpload && (
          <button
            type="button"
            onClick={openUploadModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg font-medium"
          >
            <Upload size={18} />
            Upload File
          </button>
        )}
      </div>

      {uploadSuccess && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
          {uploadSuccess}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 app-muted" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, type, user..."
            className="w-full app-input rounded-xl py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        {canViewAll && (
          <div className="max-w-sm w-full">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
            {usersLoading && <p className="text-xs app-muted mt-1">Loading users...</p>}
          </div>
        )}
      </div>

      <div className="app-surface rounded-2xl p-4 md:p-6">
        {loading ? (
          <div className="py-16 text-center app-muted italic">Loading documents...</div>
        ) : loadError ? (
          <div className="py-10 text-center">
            <p className="text-red-500 mb-3">{loadError}</p>
            <button
              type="button"
              onClick={loadDocuments}
              className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center app-muted italic">No documents found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDocuments.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="app-surface-strong rounded-2xl p-5 hover:bg-[var(--surface-hover)]/60 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 inline-flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck size={12} />
                    Stored
                  </span>
                </div>

                <p className="font-semibold leading-snug break-words">{doc.file_name}</p>
                <p className="text-xs app-muted mt-1">
                  {(doc.file_type || "UNSPECIFIED").toUpperCase()} | {new Date(doc.created_at).toLocaleDateString()}
                </p>
                {canViewAll && (
                  <>
                    <p className="text-[11px] app-muted mt-1">User: {doc.user?.full_name || `User #${doc.user_id}`}</p>
                    {doc.user?.email && <p className="text-[11px] app-muted">{doc.user.email}</p>}
                  </>
                )}
                <p className="text-[11px] app-muted mt-1 font-mono">Doc ID #{doc.id}</p>

                <div className="mt-5 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-2">
                  <a
                    href={`/document-preview/${doc.id}?name=${encodeURIComponent(doc.file_name || "")}&managed=${canUseManagedDownload ? "1" : "0"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-sm"
                  >
                    <Eye size={14} />
                    Preview
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={14} />
                    {downloadingId === doc.id ? "Downloading..." : "Download"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-6 app-surface rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-500 inline-flex items-center justify-center shrink-0">
          <ShieldCheck size={24} />
        </div>
        <p className="text-sm app-muted">
          Documents are protected by role-based access. Only authorized users can access each file.
        </p>
      </div>

      {canUpload && showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpload} className="app-surface-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Upload Document</h2>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full app-input rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="CONTRACT">Contract</option>
                  <option value="LEGAL">Legal</option>
                  <option value="IDENTITY">Identity</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="POLICY">Policy</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium app-muted mb-1.5">Choose File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full app-input rounded-xl px-3 py-2 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-500/10 file:text-indigo-500 file:text-xs file:font-medium hover:file:bg-indigo-500/15"
                  required
                />
                {selectedFile && <p className="text-xs app-muted mt-1">Selected: {selectedFile.name}</p>}
              </div>

              {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
