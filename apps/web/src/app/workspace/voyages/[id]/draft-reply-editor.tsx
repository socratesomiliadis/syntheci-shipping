"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareReply } from "lucide-react";

export function DraftReplyEditor({ body, subject }: { body: string; subject: string }) {
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-950">
        <MessageSquareReply className="h-4 w-4" />
        Draft reply
      </div>
      <div className="space-y-3">
        <Input aria-label="Draft reply subject" onChange={(event) => setDraftSubject(event.target.value)} value={draftSubject} />
        <Textarea aria-label="Draft reply body" className="min-h-72 bg-white font-mono text-sm leading-6" onChange={(event) => setDraftBody(event.target.value)} value={draftBody} />
      </div>
    </div>
  );
}
