"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { Citation } from "@syntheci/ai";
import type { CitationValidation } from "@syntheci/shared";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  FileSearch,
  Menu,
  MessageSquarePlus,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

export type SyntheciMessageMetadata = {
  citationCount?: number;
  citationWarnings?: CitationValidation;
  citations?: Citation[];
  reasoning?: string;
};

export type SyntheciDataParts = {
  citations: {
    citations: Citation[];
  };
};

export type SyntheciUIMessage = UIMessage<
  SyntheciMessageMetadata,
  SyntheciDataParts
>;

export type ChatThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage: string;
  lastRole: "user" | "assistant" | "system" | null;
  lastMessageAt: string;
};

const suggestions = [
  "Which current voyages have EU ETS or FuelEU exposure this week, and what evidence supports the risk?",
  "Which charterparty clauses matter for the latest delay events?",
  "Where do bunker documents conflict with voyage orders?",
  "Which source gaps should an analyst resolve before handover?",
];

export function ChatPanel({
  activeThreadId,
  initialMessages,
  initialThreads,
  selectedThreadId,
}: {
  activeThreadId: string;
  initialMessages: SyntheciUIMessage[];
  initialThreads: ChatThreadSummary[];
  selectedThreadId?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState(initialThreads);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<SyntheciUIMessage>({
        api: "/api/chat",
        body: { threadId: activeThreadId },
      }),
    [activeThreadId]
  );
  const { messages, sendMessage, status, error } = useChat<SyntheciUIMessage>({
    id: activeThreadId,
    messages: initialMessages,
    transport,
    onFinish: async () => {
      await refreshThreads(setThreads);
      router.refresh();
    },
  });
  const isBusy = status === "submitted" || status === "streaming";

  async function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    if (!selectedThreadId) {
      window.history.replaceState(
        null,
        "",
        `/workspace/chat?threadId=${activeThreadId}`
      );
    }
    await sendMessage(
      { text: trimmed },
      { body: { threadId: activeThreadId } }
    );
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[620px] flex-col gap-3">
      <div className="flex items-center justify-between gap-3 xl:hidden">
        <MobileSheet
          description="Open previous conversations."
          icon={<Menu className="h-4 w-4" />}
          side="left"
          title="Threads"
        >
          <ThreadList activeThreadId={activeThreadId} threads={threads} />
        </MobileSheet>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950">
                Cited maritime chat
              </div>
              <div className="truncate text-xs text-slate-500">
                Hybrid-ranked documents with chunk-level evidence
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/workspace/chat">
                <MessageSquarePlus className="h-4 w-4" />
                New
              </Link>
            </Button>
          </div>

          <Conversation className="min-h-0">
            <ConversationContent className="gap-5 px-4 py-5">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  description="Ask a voyage, charterparty, compliance, or source-audit question."
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Start with approved sources"
                >
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                      <FileSearch className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">
                        Ask across ranked evidence
                      </h2>
                      <p className="text-sm text-slate-500">
                        Answers cite indexed documents and link back to source
                        chunks.
                      </p>
                    </div>
                    <Suggestions>
                      {suggestions.map((suggestion) => (
                        <Suggestion
                          key={suggestion}
                          onClick={submitText}
                          suggestion={suggestion}
                        />
                      ))}
                    </Suggestions>
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error.message}
                </div>
              ) : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3">
            <PromptInput
              className="mx-auto rounded-lg border border-slate-200 bg-white"
              onSubmit={(message) => submitText(message.text)}
            >
              <PromptInputTextarea
                className="min-h-20 border-0 bg-transparent shadow-none focus-visible:ring-0"
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Ask for a cited brief..."
                value={input}
              />
              <PromptInputFooter className="flex items-center justify-between px-2 pb-2">
                <div className="text-xs text-slate-500">
                  Sources appear inline with cited answers
                </div>
                <PromptInputSubmit
                  disabled={!input.trim()}
                  status={isBusy ? "streaming" : "ready"}
                >
                  {isBusy ? null : <Send className="h-4 w-4" />}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
        <aside className="hidden min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white xl:block">
          <ThreadList activeThreadId={activeThreadId} threads={threads} />
        </aside>
      </div>
    </div>
  );
}

function ThreadList({
  activeThreadId,
  threads,
}: {
  activeThreadId: string;
  threads: ChatThreadSummary[];
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">Threads</div>
          <div className="text-xs text-slate-500">
            {threads.length} conversations
          </div>
        </div>
        <Button asChild size="icon-sm" variant="outline">
          <Link href="/workspace/chat" aria-label="New chat">
            <MessageSquarePlus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No saved threads yet.
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map((thread) => (
              <Link
                className={cn(
                  "block rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50",
                  activeThreadId === thread.id &&
                    "border-blue-200 bg-blue-50 hover:bg-blue-50"
                )}
                href={`/workspace/chat?threadId=${thread.id}`}
                key={thread.id}
              >
                <div className="line-clamp-2 text-sm font-medium text-slate-950">
                  {thread.title}
                </div>
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {thread.lastMessage || "No messages yet"}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  {formatDate(thread.lastMessageAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: SyntheciUIMessage }) {
  const allCitations = allCitationsForMessage(message);
  const citations = usedCitationsForMessage(message, allCitations);
  const reasoning = reasoningText(message);
  const isReasoningStreaming = message.parts.some(
    (part) => part.type === "reasoning" && part.state === "streaming"
  );
  const text = messageText(message);
  const warnings = warningForMessage(message, allCitations, text);

  return (
    <div className="space-y-2">
      {message.role === "assistant" && citations.length > 0 ? (
        <Sources>
          <SourcesTrigger count={citations.length} />
          <SourcesContent>
            {citations.map((citation) => (
              <Source
                href={citation.sourceHref}
                key={`${message.id}-${citation.chunkId}`}
                target="_self"
                title={citation.fileName}
              >
                <span className="font-medium">{citation.label}</span>
                <span className="text-slate-500">{citation.fileName}</span>
              </Source>
            ))}
          </SourcesContent>
        </Sources>
      ) : null}
      {message.role === "assistant" && reasoning ? (
        <Reasoning className="max-w-[95%]" isStreaming={isReasoningStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{reasoning}</ReasoningContent>
        </Reasoning>
      ) : null}
      <Message from={message.role}>
        <MessageContent>
          {message.role === "assistant" ? (
            <CitedResponse citations={citations} text={text} />
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </MessageContent>
      </Message>
      {message.role === "assistant" && hasWarnings(warnings) ? (
        <div className="ml-0 flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          {warningText(warnings)}
        </div>
      ) : null}
      {message.role === "assistant" ? <FeedbackButtons messageId={message.id} /> : null}
    </div>
  );
}

function FeedbackButtons({ messageId }: { messageId: string }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  async function sendFeedback(nextRating: "up" | "down") {
    setRating(nextRating);
    await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageId, rating: nextRating }),
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Mark answer helpful"
        onClick={() => sendFeedback("up")}
        size="icon"
        type="button"
        variant={rating === "up" ? "default" : "ghost"}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        aria-label="Mark answer not helpful"
        onClick={() => sendFeedback("down")}
        size="icon"
        type="button"
        variant={rating === "down" ? "default" : "ghost"}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CitedResponse({
  citations,
  text,
}: {
  citations: Citation[];
  text: string;
}) {
  const markdown =
    citations.length > 0 ? linkCitationMarkers(text, citations) : text;
  return (
    <MessageResponse className="[&_a[href*='type=file']]:mx-0.5 [&_a[href*='type=file']]:inline-flex [&_a[href*='type=file']]:h-5 [&_a[href*='type=file']]:items-center [&_a[href*='type=file']]:rounded-full [&_a[href*='type=file']]:border [&_a[href*='type=file']]:border-blue-200 [&_a[href*='type=file']]:bg-blue-50 [&_a[href*='type=file']]:px-1.5 [&_a[href*='type=file']]:text-xs [&_a[href*='type=file']]:font-semibold [&_a[href*='type=file']]:text-blue-700 [&_a[href*='type=file']]:no-underline hover:[&_a[href*='type=file']]:bg-blue-100">
      {markdown || "Retrieving evidence..."}
    </MessageResponse>
  );
}

function MobileSheet({
  children,
  description,
  icon,
  side,
  title,
}: {
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  side: "left" | "right";
  title: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          {icon}
          {title}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[88vw] p-0 sm:max-w-md" side={side}>
        <SheetHeader className="border-b border-slate-200">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

async function refreshThreads(
  setThreads: (threads: ChatThreadSummary[]) => void
) {
  const response = await fetch("/api/chat/threads");
  if (!response.ok) return;
  const payload = (await response.json()) as { threads: ChatThreadSummary[] };
  setThreads(payload.threads);
}

function linkCitationMarkers(text: string, citations: Citation[]) {
  const citationByRank = new Map(
    citations.map((citation) => [citation.rank, citation])
  );
  return text.replace(/\[(\d+)\]/g, (label, rankText) => {
    const citation = citationByRank.get(Number(rankText));
    if (!citation) return label;
    return `[\\[${rankText}\\]](${citation.sourceHref})`;
  });
}

function allCitationsForMessage(message: SyntheciUIMessage) {
  const part = message.parts.find(
    (candidate) => candidate.type === "data-citations"
  );
  if (part?.type === "data-citations") return part.data.citations;
  return message.metadata?.citations ?? [];
}

function usedCitationsForMessage(
  message: SyntheciUIMessage,
  citations: Citation[]
) {
  const usedRanks = citationRanksInText(messageText(message));
  if (usedRanks.size === 0) return [];
  return citations.filter((citation) => usedRanks.has(citation.rank));
}

function citationRanksInText(text: string) {
  return new Set([...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
}

function messageText(message: SyntheciUIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function reasoningText(message: SyntheciUIMessage) {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}

function warningForMessage(
  message: SyntheciUIMessage,
  citations: Citation[],
  text: string
): CitationValidation {
  if (message.metadata?.citationWarnings)
    return message.metadata.citationWarnings;
  const usedLabels = [
    ...new Set(
      [...text.matchAll(/\[(\d+)\]/g)].map((match) => `[${match[1]}]`)
    ),
  ];
  const validLabels = new Set(
    citations.map((citation) => `[${citation.rank}]`)
  );
  return {
    usedLabels,
    invalidLabels: usedLabels.filter((label) => !validLabels.has(label)),
    missingCitation:
      citations.length > 0 &&
      text.trim().length > 80 &&
      usedLabels.length === 0,
  };
}

function hasWarnings(warnings: CitationValidation) {
  return warnings.invalidLabels.length > 0 || warnings.missingCitation;
}

function warningText(warnings: CitationValidation) {
  if (warnings.invalidLabels.length > 0) {
    return `Answer referenced unavailable citation ${warnings.invalidLabels.join(
      ", "
    )}.`;
  }
  return "Answer has retrieved evidence but no inline citation markers.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
