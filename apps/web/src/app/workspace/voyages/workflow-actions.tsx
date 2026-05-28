"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, FileSearch, GitCompareArrows, PackageCheck, Radar, ReceiptText, RefreshCw, ShieldAlert, WandSparkles } from "lucide-react";

const workflows = [
  { id: "all", label: "Run all", icon: Radar },
  { id: "missing-documents", label: "Find gaps", icon: FileSearch },
  { id: "pda-fda", label: "PDA/FDA", icon: ReceiptText },
  { id: "reconciliation", label: "Reconcile", icon: GitCompareArrows },
  { id: "change-monitor", label: "Changes", icon: RefreshCw },
  { id: "audit", label: "Audit", icon: ClipboardCheck },
  { id: "action-plan", label: "Action plan", icon: WandSparkles },
  { id: "claims-pack", label: "Claims pack", icon: PackageCheck },
  { id: "payment-risk", label: "Payment risk", icon: ShieldAlert },
];

export function WorkflowActions({ voyageId }: { voyageId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("Idle");

  async function run(workflow: string) {
    setStatus("Running");
    const response = await fetch(`/api/workflows/${voyageId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workflow }),
    });
    const payload = (await response.json()) as { jobs?: unknown[]; error?: string };
    setStatus(response.ok ? `${payload.jobs?.length ?? 0} jobs available` : payload.error ?? "Workflow failed");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-950">Workflow actions</div>
        <div className="text-xs text-slate-500">{status}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {workflows.map((workflow) => (
          <Button key={workflow.id} onClick={() => run(workflow.id)} size="sm" type="button" variant={workflow.id === "all" ? "default" : "outline"}>
            <workflow.icon className="h-4 w-4" />
            {workflow.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
