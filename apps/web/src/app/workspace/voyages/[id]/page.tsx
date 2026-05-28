import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadVoyageCockpit } from "@/lib/voyage-workflows";
import { WorkflowActions } from "../workflow-actions";

export const dynamic = "force-dynamic";

export default async function VoyageCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await ensureDefaultWorkspace();
  const cockpit = await loadVoyageCockpit(workspaceId, id).catch(() => null);
  if (!cockpit) notFound();

  const { context } = cockpit;
  const aiJobs = cockpit.jobs.filter((job) => job.payload && (job.payload as Record<string, unknown>).generatedBy === "ai");
  const latestSummary = aiJobs
    .map((job) => (job.payload as Record<string, unknown>).runSummary)
    .find((value): value is string => typeof value === "string" && value.length > 0);
  const evidenceCount =
    context.documents.length +
    context.emails.length +
    context.events.length +
    context.aisPositions.length +
    (context.bunkerReports?.length ?? 0);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{context.voyage.status ? formatLabel(context.voyage.status) : "Voyage"}</Badge>
              {aiJobs.length > 0 ? <Badge variant="outline">AI intelligence</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">{context.voyage.id}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {context.voyage.vesselName} · {context.voyage.originPort} to {context.voyage.destinationPort} · {context.voyage.cargo}
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Metric label="ETA" value={context.voyage.eta ? formatDate(context.voyage.eta) : "Unknown"} />
            <Metric label="Open AI jobs" value={String(aiJobs.filter((job) => job.status === "open").length)} />
            <Metric label="Evidence sources" value={String(evidenceCount)} />
          </div>
        </div>
      </section>

      <WorkflowActions voyageId={context.voyage.id} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>AI Operational Intelligence</CardTitle>
            <CardDescription>Persisted work items generated from cited voyage evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiJobs.length === 0 ? (
              <p className="text-sm text-slate-500">No AI-generated jobs yet. Run a workflow action to generate intelligence from the current evidence.</p>
            ) : (
              <div className="space-y-3">
                {aiJobs.slice(0, 10).map((job) => (
                  <Link className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50" href={`/workspace/jobs/${job.id}`} key={job.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{job.title}</div>
                      <Badge variant="outline">{job.priority}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.summary}</p>
                    <JobMeta payload={job.payload as Record<string, unknown>} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Run Summary</CardTitle>
            <CardDescription>Latest grounded intelligence summary for this voyage.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              {latestSummary ?? "Run a workflow action to produce an AI summary from the voyage evidence packet."}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Findings</CardTitle>
            <CardDescription>Persisted contradictions, risks, and source-backed observations.</CardDescription>
          </CardHeader>
          <CardContent>
            <FindingList findings={cockpit.reconciliationFindings} empty="No AI findings have been persisted for this voyage." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thread Summaries</CardTitle>
            <CardDescription>Indexed email-thread summaries available as evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cockpit.threadSummaries.slice(0, 5).map((thread) => (
                <div className="rounded-lg border border-slate-200 p-3" key={thread.threadId}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">{thread.title}</div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/workspace/sources?type=email_thread&id=${thread.threadId}`}>Open</Link>
                    </Button>
                  </div>
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-500">{thread.content}</p>
                </div>
              ))}
              {cockpit.threadSummaries.length === 0 ? <p className="text-sm text-slate-500">No thread summaries indexed for this voyage.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Events, emails, documents, AIS, and structured records in time order.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cockpit.timeline.slice(0, 14).map((item) => (
                <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 p-3" key={`${item.kind}-${item.id}`}>
                  <div className="text-xs text-slate-500">{formatDate(item.timestamp)}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.kind}</Badge>
                      <span className="font-medium text-slate-950">{item.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Evidence</CardTitle>
            <CardDescription>Indexed files and emails tied to this voyage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {context.documents.slice(0, 8).map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <Badge variant="outline">file</Badge>
                    </TableCell>
                    <TableCell>
                      <Link className="font-medium text-slate-950 hover:text-blue-700" href={`/workspace/sources?type=file&id=${document.id}`}>
                        {document.fileName}
                      </Link>
                      <div className="text-xs text-slate-500">{formatLabel(document.documentType ?? "document")}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {context.emails.slice(0, 5).map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <Badge variant="outline">email</Badge>
                    </TableCell>
                    <TableCell>
                      <Link className="font-medium text-slate-950 hover:text-blue-700" href={`/workspace/sources?type=email&id=${email.id}`}>
                        {email.subject}
                      </Link>
                      <div className="text-xs text-slate-500">{email.from}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function JobMeta({ payload }: { payload: Record<string, unknown> }) {
  const confidence = typeof payload.confidence === "number" ? payload.confidence : undefined;
  const suggestedAction = typeof payload.suggestedAction === "string" ? payload.suggestedAction : undefined;
  return (
    <div className="mt-2 space-y-1 text-xs text-slate-500">
      {confidence !== undefined ? <div>{Math.round(confidence * 100)}% confidence</div> : null}
      {suggestedAction ? <div>{suggestedAction}</div> : null}
    </div>
  );
}

function FindingList({
  empty,
  findings,
}: {
  empty: string;
  findings: { title: string; summary: string; severity: string; confidence: number; suggestedAction?: string }[];
}) {
  return (
    <div className="space-y-3">
      {findings.slice(0, 6).map((finding) => (
        <div className="rounded-lg border border-slate-200 p-3" key={finding.title}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-slate-950">{finding.title}</div>
            <Badge variant="outline">{finding.severity} · {Math.round(finding.confidence * 100)}%</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{finding.summary}</p>
          {finding.suggestedAction ? <p className="mt-2 text-xs text-slate-500">{finding.suggestedAction}</p> : null}
        </div>
      ))}
      {findings.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-950">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
