"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

const starter = "Which current voyages have EU ETS or FuelEU exposure this week, and what evidence supports the risk?";

export function ChatPanel() {
  const [message, setMessage] = useState(starter);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setAnswer("");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const reader = response.body?.getReader();
    if (!reader) {
      setLoading(false);
      return;
    }

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setAnswer((current) => current + decoder.decode(value));
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-950">Ask across approved sources</div>
        <Textarea value={message} onChange={(event) => setMessage(event.target.value)} />
        <Button className="mt-3" onClick={ask} disabled={loading}>
          <Send className="h-4 w-4" />
          {loading ? "Streaming" : "Ask"}
        </Button>
      </div>
      <div className="min-h-80 rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-slate-950">Decision brief</div>
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{answer || "No answer yet."}</pre>
      </div>
    </div>
  );
}
