import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  automationRuns,
  automationRules,
  db,
  ensureDefaultWorkspace,
} from "@syntheci/db";
import { loadAdminSourceHealth, loadOperationalJobs, loadVoyageSummaries } from "@/lib/voyage-workflows";
import { AlertTriangle, ArrowRight, ClipboardCheck, Database, Radar, Ship, Workflow } from "lucide-react";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const workspaceId = await ensureDefaultWorkspace();
  const [voyages, jobs, health, runs] = await Promise.all([
    loadVoyageSummaries(workspaceId),
    loadOperationalJobs(workspaceId),
    loadAdminSourceHealth(workspaceId),
    db
      .select({
        id: automationRuns.id,
        status: automationRuns.status,
        summary: automationRuns.summary,
        createdAt: automationRuns.createdAt,
        completedAt: automationRuns.completedAt,
        ruleName: automationRules.name,
      })
      .from(automationRuns)
      .innerJoin(automationRules, eq(automationRuns.automationRuleId, automationRules.id))
      .where(eq(automationRuns.workspaceId, workspaceId))
      .orderBy(desc(automationRuns.createdAt))
      .limit(5),
  ]);

  const openJobs = jobs.filter((job) => job.status === "open" || job.status === "in_progress");
  const highRiskVoyages = voyages
    .filter((voyage) => voyage.riskLevel === "high" || (voyage.riskScore ?? 0) >= 70 || voyage.openJobs > 0)
    .sort((left, right) => (right.riskScore ?? 0) - (left.riskScore ?? 0) || right.openJobs - left.openJobs)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
              Operations overview
            </Badge>
            <Badge variant="outline">{openJobs.length} unresolved tasks</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
            Voyage risk, evidence gaps, and automations in one place.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Start from high-risk voyages, review generated workflow tasks, check source health, then jump into the voyage cockpit for evidence and actions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/workspace/voyages">
                <Ship className="h-4 w-4" />
                Open voyages
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/workspace/admin">
                <Radar className="h-4 w-4" />
                Run watchlist
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Workflow className="h-4 w-4" />
            Next operator actions
          </div>
          <div className="mt-4 space-y-3">
            <ActionLink href="/workspace/admin" label="Run or schedule daily voyage watchlist" />
            <ActionLink href="/workspace/tasks?status=open" label="Resolve the oldest open operational tasks" />
            <ActionLink href="/workspace/sources" label="Load demo data or inspect failed source ingestion" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Ship} label="Voyages" value={voyages.length} detail={`${highRiskVoyages.length} need attention`} />
        <Metric icon={ClipboardCheck} label="Open tasks" value={openJobs.length} detail={`${jobs.length} total generated`} />
        <Metric icon={Database} label="Indexed sources" value={health.totals.readyFiles + health.totals.emails} detail={`${health.totals.profileChunks} profile chunks`} />
        <Metric icon={AlertTriangle} label="Source issues" value={health.totals.failedFiles + health.totals.staleFiles} detail={`${health.totals.feedback} feedback records`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Voyages needing attention</CardTitle>
            <CardDescription>Prioritized by compliance risk and unresolved operational tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voyage</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskVoyages.map((voyage) => (
                  <TableRow key={voyage.id}>
                    <TableCell>
                      <Link className="font-medium text-slate-950 hover:text-blue-700" href={`/workspace/voyages/${voyage.id}`}>
                        {voyage.id}
                      </Link>
                      <div className="mt-1 text-xs text-slate-500">
                        {voyage.vesselName} · ETA {formatDate(voyage.eta)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={voyage.riskLevel} score={voyage.riskScore} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant={voyage.openJobs > 0 ? "default" : "outline"}>
                        <Link href={`/workspace/voyages/${voyage.id}`}>{voyage.openJobs}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {highRiskVoyages.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-20 text-center text-sm text-slate-500" colSpan={3}>
                      No high-risk voyages or open tasks yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest operational tasks</CardTitle>
            <CardDescription>Evidence-backed work items from detectors and automations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openJobs.slice(0, 6).map((job) => (
                <Link className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50" href={`/workspace/tasks/${job.id}`} key={job.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{job.title}</span>
                    <Badge variant="outline">{job.priority}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.summary}</p>
                  <div className="mt-2 text-xs text-slate-500">{job.voyageId} · {formatLabel(job.jobType)}</div>
                </Link>
              ))}
              {openJobs.length === 0 ? <p className="text-sm text-slate-500">No unresolved tasks yet. Run the watchlist from Admin.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Automation runs</CardTitle>
            <CardDescription>Recent BullMQ-backed briefs and workflow runs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {runs.map((run) => (
                <div className="rounded-lg border border-slate-200 p-3" key={run.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{run.ruleName}</span>
                    <Badge variant="outline">{run.status}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">{run.summary ?? "Queued or running."}</p>
                  <div className="mt-2 text-xs text-slate-500">{run.createdAt.toLocaleString()}</div>
                </div>
              ))}
              {runs.length === 0 ? <p className="text-sm text-slate-500">No automation runs yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source health</CardTitle>
            <CardDescription>Current indexing state for evidence retrieval and workflow detection.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <HealthItem label="Ready files" value={health.totals.readyFiles} />
              <HealthItem label="Emails" value={health.totals.emails} />
              <HealthItem label="Profile chunks" value={health.totals.profileChunks} />
              <HealthItem label="Failed/stale" value={health.totals.failedFiles + health.totals.staleFiles} />
            </div>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/workspace/admin">
                Admin source health <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Ship;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader>
        <Icon className="h-5 w-5 text-slate-600" />
        <CardTitle>{value.toLocaleString()}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-slate-500">{detail}</div>
      </CardContent>
    </Card>
  );
}

function HealthItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value.toLocaleString()}</div>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href={href}>
      {label}
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}

function RiskBadge({ level, score }: { level: string | null; score: number | null }) {
  if (!level) return <Badge variant="outline">Unscored</Badge>;
  const className =
    level === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : level === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <Badge className={className} variant="outline">
      {formatLabel(level)} {score ?? ""}
    </Badge>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
