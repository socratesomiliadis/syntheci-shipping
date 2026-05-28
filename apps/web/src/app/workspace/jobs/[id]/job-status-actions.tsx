"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const statuses = ["open", "in_progress", "resolved", "dismissed"] as const;

export function JobStatusActions({ currentStatus, jobId }: { currentStatus: string; jobId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("Idle");

  async function update(nextStatus: string) {
    setStatus("Updating");
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setStatus("Updated");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">Status</div>
        <div className="text-xs text-slate-500">{status}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Button disabled={item === currentStatus} key={item} onClick={() => update(item)} size="sm" type="button" variant={item === currentStatus ? "default" : "outline"}>
            {formatLabel(item)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
