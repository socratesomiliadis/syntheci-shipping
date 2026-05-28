"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Play, Plus } from "lucide-react";

export function AutomationForm() {
  const [name, setName] = useState("EU ETS and FuelEU weekly exposure");
  const [question, setQuestion] = useState("Which current voyages have EU ETS or FuelEU exposure this week?");
  const [status, setStatus] = useState("Idle");

  async function create() {
    setStatus("Creating rule");
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, question, cadence: "manual" }),
    });
    const body = await response.json();
    setStatus(`Created ${body.ruleId}`);
  }

  async function createAndRun() {
    setStatus("Creating and running");
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, question, cadence: "manual" }),
    });
    const body = await response.json();
    await fetch(`/api/automations/${body.ruleId}/run`, { method: "POST" });
    setStatus("Queued run");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-slate-950">Automation rule</div>
      <div className="space-y-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={create}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
          <Button type="button" onClick={createAndRun}>
            <Play className="h-4 w-4" />
            Create and run
          </Button>
        </div>
        <div className="text-xs text-slate-500">{status}</div>
      </div>
    </div>
  );
}
