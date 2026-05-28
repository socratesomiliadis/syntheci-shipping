"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ResetResponse = {
  deleted?: {
    jobs?: number;
    findings?: number;
    extractions?: number;
    snapshots?: number;
    liveSources?: number;
  };
  error?: string;
};

export function ResetVoyageDemo({
  includeLiveSources,
  voyageId,
}: {
  includeLiveSources: boolean;
  voyageId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function reset() {
    setBusy(true);
    setStatus("Resetting");
    const response = await fetch(`/api/demo/voyages/${voyageId}/reset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ includeLiveSources }),
    });
    const payload = (await response.json().catch(() => ({}))) as ResetResponse;
    if (response.ok) {
      const deleted = payload.deleted;
      const total = (deleted?.jobs ?? 0) + (deleted?.findings ?? 0) + (deleted?.extractions ?? 0) + (deleted?.snapshots ?? 0) + (deleted?.liveSources ?? 0);
      setStatus(`${total} records cleared`);
      router.refresh();
    } else {
      setStatus(payload.error ?? "Reset failed");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button disabled={busy} onClick={reset} size="sm" type="button" variant="outline">
        <RotateCcw className="h-4 w-4" />
        {busy ? "Resetting" : "Reset demo state"}
      </Button>
      {status ? <span className="text-xs text-slate-500">{status}</span> : null}
    </div>
  );
}
