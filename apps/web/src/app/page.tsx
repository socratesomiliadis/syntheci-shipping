import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Fuel,
  GitCompareArrows,
  Mail,
  MessageSquareText,
  Radar,
  ReceiptText,
  Scale,
  Ship,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const topCapabilities = [
  {
    title: "Find the issue",
    detail: "Missing NOR/SOF, ETA drift, PDA/FDA gaps, bunker mismatches, emissions exposure, and source conflicts.",
    icon: FileSearch,
  },
  {
    title: "Show the evidence",
    detail: "Every answer, task, contradiction, and draft reply links back to documents, emails, AIS, or structured records.",
    icon: ClipboardCheck,
  },
  {
    title: "Create the work",
    detail: "High-confidence findings become operational tasks for the team, without changing your existing task lifecycle.",
    icon: Sparkles,
  },
];

const cockpitPanels = [
  { label: "Contradictions", value: "4", tone: "text-red-700 bg-red-50 border-red-200", icon: GitCompareArrows },
  { label: "Extracted facts", value: "38", tone: "text-blue-700 bg-blue-50 border-blue-200", icon: FileText },
  { label: "Audit checks", value: "2", tone: "text-amber-700 bg-amber-50 border-amber-200", icon: ClipboardCheck },
  { label: "Action tasks", value: "7", tone: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
];

const sources = [
  { label: "Voyages", icon: Ship },
  { label: "Emails", icon: Mail },
  { label: "Contracts", icon: FileText },
  { label: "AIS", icon: Radar },
  { label: "Bunkers", icon: Fuel },
  { label: "Compliance", icon: Scale },
  { label: "PDA/FDA", icon: ReceiptText },
];

const workflows = [
  "Extract maritime facts from NOR, SOF, BDN, PDA, FDA, invoices, and charterparty excerpts.",
  "Detect contradictions across voyage orders, AIS updates, emails, fuel evidence, claims, and payments.",
  "Draft cited replies and claims packs with unsupported-claim warnings.",
  "Monitor what changed since the last run and create tasks when confidence is high.",
];

const differentiators = [
  {
    title: "Not another maritime database",
    body: "Syntheci does not just store voyage records. It turns messy evidence into decisions, risks, and next actions.",
  },
  {
    title: "Built around the voyage",
    body: "Documents, emails, AIS, bunker data, claims events, compliance flags, and source confidence all roll up to a voyage cockpit.",
  },
  {
    title: "Audit-ready by default",
    body: "Operators can see what evidence supports a statement, what is missing, and which contradictions should block external reliance.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Syntheci home">
            <BrandLogo className="w-36" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="#workflows" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 sm:block">
              Workflows
            </Link>
            <Link href="#platform" className="hidden text-sm font-medium text-slate-600 hover:text-slate-950 sm:block">
              Platform
            </Link>
            <Button asChild className="bg-[#1447e5] text-white hover:bg-[#1447e5]/90">
              <Link href="/login">
                Open demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(15,23,42,0.88)_44%,rgba(15,23,42,0.58)_100%)]" />
        <ProductCockpitBackground />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-sm font-medium text-blue-100">
              <Bot className="h-4 w-4" />
              Voyage intelligence cockpit
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl lg:text-6xl">
              Syntheci turns maritime evidence into the next action.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              One workspace that reads voyage documents, emails, AIS, bunker records, claims events, and compliance flags,
              then finds gaps, contradictions, risks, cited replies, and tasks your operators can act on.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-[#1447e5] hover:bg-white/90">
                <Link href="/login">
                  Open demo workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/15"
              >
                <Link href="#quick-read">Understand in 30 seconds</Link>
              </Button>
            </div>
          </div>

          <div id="quick-read" className="mt-12 grid max-w-5xl gap-3 sm:grid-cols-3">
            {topCapabilities.map((item) => (
              <div key={item.title} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <item.icon className="h-5 w-5 text-blue-200" />
                <h2 className="mt-3 text-sm font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <div className="text-sm font-semibold text-[#1447e5]">What the platform does</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              It connects the sources, checks the story, and tells operations what to do next.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Traditional maritime software shows records. Syntheci compares those records against the evidence trail and
              highlights what is missing, conflicting, risky, or ready to send.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {differentiators.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflows" className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="text-sm font-semibold text-[#1447e5]">Current feature set</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
                Built for the daily exceptions that slow down voyage teams.
              </h2>
            </div>
            <div className="grid gap-3">
              {workflows.map((workflow, index) => (
                <div key={workflow} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1447e5] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{workflow}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cockpitPanels.map((panel) => (
              <div key={panel.label} className={`rounded-lg border p-4 ${panel.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <panel.icon className="h-5 w-5" />
                  <div className="text-2xl font-semibold">{panel.value}</div>
                </div>
                <div className="mt-3 text-sm font-semibold">{panel.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold text-[#1447e5]">Evidence in, decisions out</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Syntheci works across the sources your team already relies on.
            </h2>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="bg-[#1447e5] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <CheckCircle2 className="h-4 w-4" />
              Demo workspace included
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              See voyages, sources, cited chat, contradictions, audit checks, and generated tasks.
            </h2>
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

function ProductCockpitBackground() {
  return (
    <div className="pointer-events-none absolute inset-y-10 right-[-320px] hidden w-[760px] rotate-[-2deg] opacity-90 lg:block xl:right-[-240px]">
      <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-xs font-medium text-blue-100">VOY-2026-0523</div>
            <div className="mt-1 text-lg font-semibold text-white">AMS Dorian · Claims and payment exception</div>
          </div>
          <div className="rounded-md border border-red-300/30 bg-red-400/15 px-3 py-1 text-xs font-semibold text-red-100">
            high risk
          </div>
        </div>
        <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            {[
              ["PDA indexed, FDA pending", "Payment risk"],
              ["AIS ETA shifted +27h", "Change monitor"],
              ["Bunker quantity mismatch", "Reconciliation"],
              ["NOR/SOF evidence required", "Audit"],
            ].map(([title, label]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs text-slate-300">{label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200/20 bg-blue-400/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                <MessageSquareText className="h-4 w-4" />
                Cited reply draft
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Current position remains provisional pending FDA evidence and reconciliation of bunker figures against
                indexed BDN support.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Primary docs", "AIS", "Email thread"].map((label) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-3">
                  <div className="text-lg font-semibold text-white">92%</div>
                  <div className="mt-1 text-xs text-slate-300">{label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-emerald-200/20 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-100">
              7 high-confidence tasks ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
