import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadVoyageCockpit } from "@/lib/voyage-workflows";
import { WorkflowActions } from "../workflow-actions";
import { AlertTriangle, FileText, PackageCheck, ShieldAlert } from "lucide-react";
import { DraftReplyEditor } from "./draft-reply-editor";

export const dynamic = "force-dynamic";

export default async function VoyageCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await ensureDefaultWorkspace();
  const cockpit = await loadVoyageCockpit(workspaceId, id).catch(() => null);
  if (!cockpit) notFound();

  const { context } = cockpit;
  const compliance = context.complianceFlag;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{context.voyage.status ? formatLabel(context.voyage.status) : "Voyage"}</Badge>
              {compliance ? <RiskBadge level={compliance.riskLevel} score={compliance.riskScore} /> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950">{context.voyage.id}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {context.voyage.vesselName} · {context.voyage.originPort} to {context.voyage.destinationPort} · {context.voyage.cargo}
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Metric label="ETA" value={context.voyage.eta ? formatDate(context.voyage.eta) : "Unknown"} />
            <Metric label="Open jobs" value={String(cockpit.jobs.filter((job) => job.status === "open").length)} />
            <Metric label="Source gaps" value={String(cockpit.missingDocumentDrafts.length)} />
          </div>
        </div>
      </section>

      <WorkflowActions voyageId={context.voyage.id} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational Jobs</CardTitle>
            <CardDescription>Persisted work items generated from voyage workflow checks.</CardDescription>
          </CardHeader>
          <CardContent>
            {cockpit.jobs.length === 0 ? (
              <p className="text-sm text-slate-500">No persisted jobs yet. Run workflow actions to create them.</p>
            ) : (
              <div className="space-y-3">
                {cockpit.jobs.slice(0, 8).map((job) => (
                  <Link className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50" href={`/workspace/jobs/${job.id}`} key={job.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-950">{job.title}</div>
                      <Badge variant="outline">{job.priority}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.summary}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Draft Reply Assistant</CardTitle>
            <CardDescription>Editable deterministic draft based on current gaps and risk signals.</CardDescription>
          </CardHeader>
          <CardContent>
            <DraftReplyEditor body={cockpit.draftReply.body} subject={cockpit.draftReply.subject} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Events, emails, documents, AIS, and compliance signals in time order.</CardDescription>
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
            <CardTitle>Thread Summaries</CardTitle>
            <CardDescription>Indexed email-thread summaries with open questions, decisions, and missing-document signals.</CardDescription>
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

      <section className="grid gap-5 xl:grid-cols-3">
        <WorkflowPanel icon={FileText} title="Missing Documents" drafts={cockpit.missingDocumentDrafts} />
        <WorkflowPanel icon={ShieldAlert} title="Payment Risk" drafts={cockpit.paymentRiskDrafts} />
        <WorkflowPanel icon={PackageCheck} title="Claims Pack" drafts={cockpit.claimsPackDrafts} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Charterparty Extraction</CardTitle>
            <CardDescription>Clause cards extracted from indexed charterparty excerpts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cockpit.charterpartyClauses.map((clause) => (
                <div className="rounded-lg border border-slate-200 p-3" key={clause.key}>
                  <div className="font-medium text-slate-950">{clause.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{clause.text}</p>
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

function WorkflowPanel({ drafts, icon: Icon, title }: { drafts: { title: string; summary: string; priority: string }[]; icon: typeof AlertTriangle; title: string }) {
  return (
    <Card>
      <CardHeader>
        <Icon className="h-5 w-5 text-slate-600" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{drafts.length} candidate workflow items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {drafts.slice(0, 4).map((draft) => (
            <div className="rounded-lg border border-slate-200 p-3" key={draft.title}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-950">{draft.title}</div>
                <Badge variant="outline">{draft.priority}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{draft.summary}</p>
            </div>
          ))}
          {drafts.length === 0 ? <p className="text-sm text-slate-500">No candidate items detected.</p> : null}
        </div>
      </CardContent>
    </Card>
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

function RiskBadge({ level, score }: { level: string; score: number }) {
  const className =
    level === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : level === "medium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <Badge className={className} variant="outline">
      {formatLabel(level)} {score}
    </Badge>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
