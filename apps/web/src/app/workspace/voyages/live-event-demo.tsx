"use client";

import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useState } from "react";
import { AlertTriangle, RadioTower, ReceiptText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LiveDemoResponse = {
  ai?: {
    jobsAvailable?: number;
    tasksCreated?: number;
    workflowRunId?: string;
  };
  disputedCostUsd?: number;
  error?: string;
};

export function LiveEventDemo({ active, voyageId }: { active: boolean; voyageId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(active ? "Live event active" : "Ready");
  const [busy, setBusy] = useState(false);

  async function injectLiveEvent() {
    setBusy(true);
    setStatus("Receiving update and running AI");
    const response = await fetch("/api/live-demo/ams-dorian", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as LiveDemoResponse;
    if (response.ok) {
      const disputed = payload.disputedCostUsd ? `$${payload.disputedCostUsd.toLocaleString()}` : "$10,050";
      const jobs = payload.ai?.tasksCreated ?? payload.ai?.jobsAvailable;
      setStatus(`${jobs ?? "AI"} tasks ready · ${disputed} held`);
      if (payload.ai?.workflowRunId) {
        router.push(`/workspace/voyages/${voyageId}?run=${payload.ai.workflowRunId}`);
      } else {
        router.refresh();
      }
    } else {
      setStatus(payload.error ?? "Live event failed");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-300 bg-white text-amber-800" variant="outline">
              Live Data Demo
            </Badge>
            {active ? <Badge className="border-emerald-300 bg-white text-emerald-700" variant="outline">Event active</Badge> : null}
          </div>
          <h2 className="mt-2 text-base font-semibold text-slate-950">Sirocco port-agent update</h2>
          <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <LiveMetric icon={RadioTower} label="Source" value="Port webhook" />
            <LiveMetric icon={AlertTriangle} label="Delay" value="18h berth wait" />
            <LiveMetric icon={ReceiptText} label="Cost hold" value="$10,050" />
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <Button disabled={busy} onClick={injectLiveEvent} type="button">
            <ShieldCheck className="h-4 w-4" />
            {busy ? "Running AI" : active ? "Re-run AI response" : "Inject live event"}
          </Button>
          <span className="text-xs text-slate-600">{status}</span>
        </div>
      </div>
    </section>
  );
}

function LiveMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-amber-700" />
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate font-medium text-slate-950">{value}</div>
      </div>
    </div>
  );
}
