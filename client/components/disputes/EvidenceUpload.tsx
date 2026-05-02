"use client";

import { useState } from "react";
import api from "@/services/api";

export default function EvidenceUpload({ disputeId }: { disputeId: string }) {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("Evidence file must be smaller than 10MB.");
      return;
    }

    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    const upload = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    const data = await upload.json();

    await api.post(`/disputes/${disputeId}/evidence`, {
      url: data.url,
      type: file.type.includes("pdf") ? "pdf" : "image",
    });

    setUploading(false);
    alert("Evidence uploaded");
  };

  return (
    <input
      type="file"
      accept="image/*,.pdf"
      disabled={uploading}
      onChange={(e) => {
        if (!e.target.files?.[0]) return;
        uploadFile(e.target.files[0]);
      }}
    />
  );
}
