"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export const automationRunsChangedEvent = "syntheci:automation-runs-changed";

type AutomationRun = {
  id: string;
  status: string;
  summary: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  ruleName: string;
};

export function RecentAutomationRuns({ initialRuns }: { initialRuns: AutomationRun[] }) {
  const [runs, setRuns] = useState(initialRuns);

  const refreshRuns = useCallback(async () => {
    const response = await fetch("/api/automations", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { runs?: AutomationRun[] };
    setRuns(payload.runs ?? []);
  }, []);

  useEffect(() => {
    function handleRunsChanged() {
      void refreshRuns();
    }

    window.addEventListener(automationRunsChangedEvent, handleRunsChanged);
    return () => window.removeEventListener(automationRunsChangedEvent, handleRunsChanged);
  }, [refreshRuns]);

  useEffect(() => {
    if (!runs.some((run) => run.status === "queued" || run.status === "running")) return;

    const interval = window.setInterval(() => {
      void refreshRuns();
    }, 2000);
    return () => window.clearInterval(interval);
  }, [refreshRuns, runs]);

  if (runs.length === 0) {
    return <p className="text-sm text-slate-500">No automation runs yet.</p>;
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <div className="rounded-lg border border-slate-200 p-3" key={run.id}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-950">{run.ruleName}</div>
            <Badge variant="outline">{run.status}</Badge>
          </div>
          <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-500">
            {run.summary ?? run.error ?? "Queued or running. This panel will update automatically."}
          </p>
          <div className="mt-2 text-xs text-slate-500">{new Date(run.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
