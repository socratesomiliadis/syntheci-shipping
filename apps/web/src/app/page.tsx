import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSearch,
  FileText,
  Fuel,
  Mail,
  MessageSquareText,
  Radar,
  Scale,
  Ship,
} from "lucide-react";
import Link from "next/link";

const sources = [
  { label: "Voyage + vessel data", icon: Ship },
  { label: "Documents + contracts", icon: FileText },
  { label: "Emails and operator notes", icon: Mail },
  { label: "AIS positions", icon: Radar },
  { label: "Bunker reports", icon: Fuel },
  { label: "Compliance flags", icon: Scale },
];

const outcomes = [
  {
    title: "Risk briefs",
    description: "Condensed voyage, claims, compliance, and commercial context with the evidence that matters.",
    icon: AlertTriangle,
  },
  {
    title: "Chat with citations",
    description: "Ask operational questions and get answers tied back to source documents, rows, and messages.",
    icon: MessageSquareText,
  },
  {
    title: "Alerts and next actions",
    description: "Detect drift, missing evidence, contract exposure, ETA changes, and follow-up work before handover.",
    icon: Bell,
  },
  {
    title: "Reports + audit trail",
    description: "Generate repeatable reports with a clear record of sources, reasoning, outputs, and decisions.",
    icon: ClipboardList,
  },
];

const workflow = [
  "Connect approved maritime sources",
  "Retrieve the right evidence",
  "Reason across conflicting context",
  "Ship cited actions to the team",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Syntheci home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1447e5] text-white">
              <Anchor className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold tracking-normal">Syntheci</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="#platform" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 sm:block">
              Platform
            </Link>
            <Button asChild className="bg-[#1447e5] text-white hover:bg-[#1447e5]/90">
              <Link href="/login">
                Demo login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#1447e5]/20 bg-[#1447e5]/5 px-3 py-1 text-sm font-medium text-[#1447e5]">
              <Bot className="h-4 w-4" />
              Maritime reasoning engine
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Turn scattered shipping context into actionable operational intelligence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Syntheci combines voyage, vessel, document, contract, email, AIS, bunker, and compliance data, then
              uses retrieval and reasoning to produce cited answers, risk briefs, alerts, next actions, reports, and
              audit trails.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#1447e5] text-white hover:bg-[#1447e5]/90">
                <Link href="/login">
                  Open demo workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              >
                <Link href="#platform">See how it works</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Database className="h-4 w-4 text-[#1447e5]" />
                Live voyage intelligence
              </div>
              <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                6 sources synced
              </div>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                {sources.slice(0, 5).map((source) => (
                  <div key={source.label} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1447e5]/10 text-[#1447e5]">
                      <source.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{source.label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-[#1447e5]/20 bg-[#1447e5]/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1447e5]">
                    <FileSearch className="h-4 w-4" />
                    Risk brief ready
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    Charterparty exposure, late bunker stem evidence, AIS deviation, and port weather notice all point
                    to a handover risk before arrival.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-normal text-slate-500">Cited answer</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    A latest-change question found 3 new signals and linked each answer to the source
                    document, email, and AIS event.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-2xl font-semibold text-slate-950">14</div>
                    <div className="text-xs text-slate-500">next actions</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-2xl font-semibold text-slate-950">100%</div>
                    <div className="text-xs text-slate-500">source trace</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950">One workspace for every signal.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Syntheci is built for maritime teams who need quick, defensible decisions from messy operational data.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <div key={source.label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1447e5]/10 text-[#1447e5]">
                  <source.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-slate-800">{source.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950">
              Retrieval plus reasoning, not another search box.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The engine pulls evidence from structured records and unstructured communications, reconciles conflicts,
              and produces outputs your operators can act on.
            </p>
            <div className="mt-6 space-y-3">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1447e5] text-xs text-white">
                    {index + 1}
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1447e5]/10 text-[#1447e5]">
                  <outcome.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950">{outcome.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{outcome.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-[#1447e5] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <CheckCircle2 className="h-4 w-4" />
              Demo workspace included
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">See the dashboard, chat, sources, and runs.</h2>
          </div>
          <Button asChild size="lg" className="bg-white text-[#1447e5] hover:bg-white/90">
            <Link href="/login">
              Login with demo account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
