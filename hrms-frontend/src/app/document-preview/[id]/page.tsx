"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { DocumentService } from "@/services/hr.service";

const inferMimeType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "txt") return "text/plain";
  return "application/octet-stream";
};

export default function DocumentPreviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = useMemo(() => Number(params?.id), [params]);
  const name = useMemo(() => searchParams.get("name") || `document-${params?.id ?? ""}`, [params?.id, searchParams]);
  const useManagedEndpoint = useMemo(() => searchParams.get("managed") === "1", [searchParams]);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getErrorMessage = (e: unknown): string => {
    const response = (e as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
    const backendMessage = response?.data?.error || response?.data?.message;
    if (response?.status === 404) {
      return backendMessage || "Document file was not found on the server. Please re-upload this file.";
    }
    return backendMessage || "Failed to load document preview.";
  };

  useEffect(() => {
    let revokeUrl = "";
    const load = async () => {
      if (!Number.isFinite(id) || id <= 0) {
        setError("Invalid document id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const blob = useManagedEndpoint
          ? await DocumentService.downloadManaged(id)
          : await DocumentService.download(id);
        const typedBlob = blob.type ? blob : new Blob([blob], { type: inferMimeType(name) });
        const objectUrl = window.URL.createObjectURL(typedBlob);
        revokeUrl = objectUrl;
        setUrl(objectUrl);
      } catch (e) {
        console.error("Preview loading failed", e);
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => {
      if (revokeUrl) {
        window.URL.revokeObjectURL(revokeUrl);
      }
    };
  }, [id, name, useManagedEndpoint]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1020]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-sm font-medium">{name}</p>
          {url && (
            <a
              href={url}
              download={name}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              <Download size={14} />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-300">
            Loading preview...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-10 text-center text-sm text-red-200">
            {error}
          </div>
        ) : (
          <iframe
            src={url}
            title="Document Preview"
            className="h-[calc(100vh-100px)] w-full rounded-xl border border-white/10 bg-white"
          />
        )}
      </div>
    </div>
  );
}
