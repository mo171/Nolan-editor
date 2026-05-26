"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/store/authStore";

/**
 * useDnaUpload — uploads a DNA reference file to /api/projects/{id}/dna-upload
 * Uses multipart/form-data (browser sets the boundary automatically).
 * Shows/hides the DNA processing overlay via `isUploading`.
 */
export function useDnaUpload() {
  const { session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  async function uploadDna(projectId, file) {
    if (!file || !projectId) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/projects/${projectId}/dna-upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "DNA upload failed");
      }

      const result = await res.json();
      setUploadResult(result); // { status: "queued", filename: "..." }
      return result;
    } catch (err) {
      setUploadError(err.message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadDna, isUploading, uploadError, uploadResult };
}
