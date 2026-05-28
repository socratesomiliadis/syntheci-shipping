"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Radar } from "lucide-react";

export function WatchlistAction() {
  const router = useRouter();
  const [status, setStatus] = useState("Idle");

  async function run() {
    setStatus("Running daily watchlist");
    const response = await fetch("/api/watchlist", { method: "POST" });
    const payload = (await response.json()) as { results?: { voyageId: string; jobCount: number }[] };
    const count = payload.results?.reduce((sum, result) => sum + result.jobCount, 0) ?? 0;
    setStatus(response.ok ? `${count} watchlist tasks available` : "Watchlist failed");
    router.refresh();
  }

  async function schedule() {
    setStatus("Scheduling daily watchlist");
    const response = await fetch("/api/watchlist/schedule", { method: "POST" });
    const payload = (await response.json()) as { ruleId?: string; error?: string };
    setStatus(response.ok ? `Scheduled ${payload.ruleId}` : payload.error ?? "Schedule failed");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">Daily voyage watchlist</div>
        <div className="text-xs text-slate-500">{status}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={run} size="sm" type="button">
          <Radar className="h-4 w-4" />
          Run now
        </Button>
        <Button onClick={schedule} size="sm" type="button" variant="outline">
          <Radar className="h-4 w-4" />
          Schedule daily
        </Button>
      </div>
    </div>
  );
}
