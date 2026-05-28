"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseWorkflowIntent } from "@syntheci/shared";
import { Bot, Clock, FileSearch, GitCompareArrows, Play, Plus, ShieldCheck } from "lucide-react";
import { automationRunsChangedEvent } from "./recent-automation-runs";

const templates = [
  {
    name: "Morning voyage exception scan",
    question: "Every morning reconcile PDA, FDA, missing NOR/SOF, and payment risk across all active voyages.",
  },
  {
    name: "FuelEU and MRV watchlist",
    question: "Daily watch FuelEU, EU ETS, MRV missing data, and bunker evidence gaps across active voyages.",
  },
  {
    name: "Claims evidence monitor",
    question: "Every morning find claims, demurrage, NOR, SOF, and berth delay evidence gaps across active voyages.",
  },
];

const cadences = ["manual", "hourly", "daily", "weekly"] as const;

export function AutomationForm() {
  const router = useRouter();
  const [name, setName] = useState(templates[0].name);
  const [question, setQuestion] = useState(templates[0].question);
  const [cadence, setCadence] = useState<(typeof cadences)[number]>("manual");
  const [status, setStatus] = useState("Idle");
  const parsed = parseWorkflowIntent(question);

  async function create(runNow: boolean) {
    setStatus(runNow ? "Creating and queueing run" : "Creating rule");
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, question, cadence }),
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error ?? "Automation failed");
      return;
    }
    if (runNow) {
      const runResponse = await fetch(`/api/automations/${body.ruleId}/run`, { method: "POST" });
      const runBody = await runResponse.json();
      setStatus(runResponse.ok ? `Queued ${runBody.parsedIntent?.workflow ?? parsed.workflow} run` : runBody.error ?? "Run failed");
      if (runResponse.ok) {
        window.dispatchEvent(new Event(automationRunsChangedEvent));
      }
    } else {
      setStatus(`Created ${body.parsedIntent?.workflow ?? parsed.workflow} rule`);
      if (body.parsedIntent?.cadence && body.parsedIntent.cadence !== "manual") {
        window.dispatchEvent(new Event(automationRunsChangedEvent));
      }
    }
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Bot className="h-4 w-4 text-blue-700" />
            AI automation rule
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Describe the monitoring workflow in plain English. Syntheci parses it into a runnable voyage workflow.
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Parsed: {parsed.workflow} · {parsed.scope}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.75fr]">
        <div className="space-y-3">
          <Input aria-label="Automation name" value={name} onChange={(event) => setName(event.target.value)} />
          <Textarea
            aria-label="Automation workflow description"
            className="min-h-28"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {cadences.map((item) => (
              <Button key={item} type="button" size="sm" variant={cadence === item ? "default" : "outline"} onClick={() => setCadence(item)}>
                <Clock className="h-4 w-4" />
                {item}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => create(false)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
          <Button type="button" onClick={() => create(true)}>
            <Play className="h-4 w-4" />
            Create and run
          </Button>
          </div>
          <div className="text-xs text-slate-500">{status}</div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Judge-ready examples</div>
          {templates.map((template) => (
            <button
              className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
              key={template.name}
              type="button"
              onClick={() => {
                setName(template.name);
                setQuestion(template.question);
              }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                {template.name.includes("Claims") ? <ShieldCheck className="h-4 w-4 text-blue-700" /> : template.name.includes("Fuel") ? <FileSearch className="h-4 w-4 text-blue-700" /> : <GitCompareArrows className="h-4 w-4 text-blue-700" />}
                {template.name}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{template.question}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
