import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { AMS_DORIAN_LIVE_DEMO_VOYAGE_ID, isAmsDorianLiveDemoSource } from "@/lib/live-demo-events";
import { loadVoyageCockpit } from "@/lib/voyage-workflows";
import { LiveEventDemo } from "../live-event-demo";
import { WorkflowActions } from "../workflow-actions";

export const dynamic = "force-dynamic";

const workflowResultCards = [
  { id: "payment-risk", title: "Payment Risk", description: "Invoices, remittance, approvals, and payment holds." },
  { id: "pda-fda", title: "PDA/FDA", description: "Disbursement account evidence and finance reconciliation." },
  { id: "claims-pack", title: "Claims Pack", description: "Claim support, delay evidence, SOF/NOR, and laytime signals." },
  { id: "reconciliation", title: "Reconciliation", description: "Contradictions and mismatches across voyage sources." },
  { id: "missing-documents", title: "Source Gaps", description: "Missing, stale, or referenced-but-unavailable evidence." },
  { id: "change-monitor", title: "Changes", description: "Material changes in ETA, status, documents, or instructions." },
  { id: "audit", title: "Audit", description: "Traceability, supportability, and source-confidence issues." },
  { id: "action-plan", title: "Action Plan", description: "Prioritized operator actions from the strongest cited evidence." },
];

export default async function VoyageCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await ensureDefaultWorkspace();
  const cockpit = await loadVoyageCockpit(workspaceId, id).catch(() => null);
  if (!cockpit) notFound();

  const { context } = cockpit;
  const aiJobs = cockpit.jobs.filter((job) => job.payload && (job.payload as Record<string, unknown>).generatedBy === "ai");
  const workflowResults = buildWorkflowResults(
    aiJobs,
    cockpit.reconciliationFindings.filter((finding) => finding.findingType !== "risk_assessment"),
  );
  const latestSummary = aiJobs
    .map((job) => (job.payload as Record<string, unknown>).runSummary)
    .find((value): value is string => typeof value === "string" && value.length > 0);
  const riskAssessment = cockpit.riskAssessment;
  const evidenceCount =
    context.documents.length +
    context.emails.length +
    context.events.length +
    context.aisPositions.length +
    (context.bunkerReports?.length ?? 0);
  const isLiveDemoVoyage = context.voyage.id === AMS_DORIAN_LIVE_DEMO_VOYAGE_ID;
  const liveDemoActive = isLiveDemoVoyage && (
    context.documents.some((document) => isAmsDorianLiveDemoSource(document.id)) ||
    context.emails.some((email) => isAmsDorianLiveDemoSource(email.id)) ||
    context.events.some((event) => isAmsDorianLiveDemoSource(event.id))
  );

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
            <Metric label="AI risk" value={riskAssessment ? `${formatLabel(riskAssessment.riskLevel)} ${riskAssessment.riskScore}` : "Unscored"} />
            <Metric label="Open AI jobs" value={String(aiJobs.filter((job) => job.status === "open").length)} />
            <Metric label="Evidence sources" value={String(evidenceCount)} />
          </div>
        </div>
      </section>

      {isLiveDemoVoyage ? <LiveEventDemo active={liveDemoActive} /> : null}

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
            {riskAssessment ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Risk {riskAssessment.riskScore}</Badge>
                  <Badge variant="outline">{formatLabel(riskAssessment.riskLevel)}</Badge>
                  <span className="text-xs text-slate-500">{Math.round(riskAssessment.confidence * 100)}% confidence</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{riskAssessment.summary}</p>
                {riskAssessment.rationale.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
                    {riskAssessment.rationale.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Workflow Results</h2>
            <p className="mt-1 text-sm text-slate-500">Latest AI jobs and findings grouped by the workflow button that produced them.</p>
          </div>
          <Badge variant="outline">{workflowResults.total} persisted outputs</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowResultCards.map((workflow) => (
            <WorkflowResultCard
              description={workflow.description}
              findings={workflowResults.byWorkflow.get(workflow.id)?.findings ?? []}
              jobs={workflowResults.byWorkflow.get(workflow.id)?.jobs ?? []}
              key={workflow.id}
              title={workflow.title}
            />
          ))}
        </div>
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

type AiJob = {
  id: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  payload: unknown;
};

type AiFinding = {
  title: string;
  summary: string;
  severity: string;
  confidence: number;
  suggestedAction?: string;
  payload: unknown;
};

function WorkflowResultCard({
  description,
  findings,
  jobs,
  title,
}: {
  description: string;
  findings: AiFinding[];
  jobs: AiJob[];
  title: string;
}) {
  const hasResults = jobs.length > 0 || findings.length > 0;
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant="outline">{jobs.length + findings.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {hasResults ? (
          <div className="space-y-3">
            {jobs.slice(0, 2).map((job) => (
              <Link className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50" href={`/workspace/jobs/${job.id}`} key={job.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{job.title}</div>
                  <Badge variant="outline">{job.priority}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.summary}</p>
              </Link>
            ))}
            {findings.slice(0, 2).map((finding) => (
              <div className="rounded-lg border border-slate-200 p-3" key={`${finding.title}:${finding.summary}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-950">{finding.title}</div>
                  <Badge variant="outline">{finding.severity} · {Math.round(finding.confidence * 100)}%</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{finding.summary}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No AI output from this workflow yet.</p>
        )}
      </CardContent>
    </Card>
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

function buildWorkflowResults(jobs: AiJob[], findings: AiFinding[]) {
  const byWorkflow = new Map<string, { jobs: AiJob[]; findings: AiFinding[] }>();
  for (const workflow of workflowResultCards) {
    byWorkflow.set(workflow.id, { jobs: [], findings: [] });
  }

  for (const job of jobs) {
    const workflow = workflowFromPayload(job.payload);
    if (!workflow) continue;
    const bucket = byWorkflow.get(workflow) ?? { jobs: [], findings: [] };
    bucket.jobs.push(job);
    byWorkflow.set(workflow, bucket);
  }

  for (const finding of findings) {
    const workflow = workflowFromPayload(finding.payload);
    if (!workflow) continue;
    const bucket = byWorkflow.get(workflow) ?? { jobs: [], findings: [] };
    bucket.findings.push(finding);
    byWorkflow.set(workflow, bucket);
  }

  return {
    byWorkflow,
    total: [...byWorkflow.values()].reduce((count, result) => count + result.jobs.length + result.findings.length, 0),
  };
}

function workflowFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const workflow = (payload as Record<string, unknown>).workflow;
  return typeof workflow === "string" ? workflow : null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
