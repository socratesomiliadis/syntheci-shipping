"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";

export function SourceUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("Idle");

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus("Preparing upload");
    const uploadResponse = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "text/plain",
        sizeBytes: file.size,
      }),
    });
    const upload = await uploadResponse.json();

    setStatus("Uploading source");
    await fetch(upload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type || "text/plain" },
      body: file,
    });

    setStatus("Queueing ingestion");
    await fetch("/api/ingestion/enqueue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId: upload.documentId }),
    });

    setStatus("Queued for ingestion");
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm font-semibold text-slate-950">Add source</div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input ref={inputRef} type="file" accept=".txt,.md,.csv,.json,.log" />
        <Button onClick={upload} type="button">
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>
      <div className="text-xs text-slate-500">{status}</div>
    </div>
  );
}
