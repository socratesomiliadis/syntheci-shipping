"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export function RunAutomationButton({ ruleId }: { ruleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const response = await fetch(`/api/automations/${ruleId}/run`, { method: "POST" });
    await response.json().catch(() => null);
    setBusy(false);
    router.refresh();
  }

  return (
    <Button disabled={busy} onClick={run} size="sm" type="button">
      <Play className="h-4 w-4" />
      {busy ? "Queueing" : "Run"}
    </Button>
  );
}
