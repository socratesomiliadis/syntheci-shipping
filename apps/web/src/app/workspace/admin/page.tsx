import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadAdminSourceHealth } from "@/lib/voyage-workflows";
import { AlertTriangle, Database, FileText, MessageSquare, ThumbsUp } from "lucide-react";
import { WatchlistAction } from "./watchlist-action";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const workspaceId = await ensureDefaultWorkspace();
  const health = await loadAdminSourceHealth(workspaceId);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-950">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Source health, indexed record counts, failed ingestion, and open workflow state.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FileText} label="Ready files" value={health.totals.readyFiles} />
        <Metric icon={MessageSquare} label="Emails" value={health.totals.emails} />
        <Metric icon={Database} label="Profile chunks" value={health.totals.profileChunks} />
        <Metric icon={ThumbsUp} label="Feedback" value={health.totals.feedback} />
      </section>

      <WatchlistAction />

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <AlertTriangle className="h-5 w-5 text-slate-600" />
            <CardTitle>Failed or stale files</CardTitle>
            <CardDescription>{health.totals.failedFiles} failed files and {health.totals.staleFiles} not ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {health.failedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-slate-500">{file.error}</TableCell>
                  </TableRow>
                ))}
                {health.failedFiles.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-20 text-center text-sm text-slate-500" colSpan={3}>
                      No failed files.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open operational jobs</CardTitle>
            <CardDescription>Latest unresolved workflow items.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health.openJobs.map((job) => (
                <Link className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50" href={`/workspace/jobs/${job.id}`} key={job.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">{job.title}</span>
                    <Badge variant="outline">{job.priority}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{job.voyageId} · {formatLabel(job.jobType)}</div>
                </Link>
              ))}
              {health.openJobs.length === 0 ? <p className="text-sm text-slate-500">No open jobs.</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <Icon className="h-5 w-5 text-slate-600" />
        <CardTitle>{value.toLocaleString()}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
