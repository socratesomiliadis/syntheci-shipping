import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, ensureDefaultWorkspace, operationalJobs } from "@syntheci/db";
import { and, eq } from "drizzle-orm";
import { TaskStatusActions } from "./task-status-actions";

export const dynamic = "force-dynamic";

type Evidence = {
  sourceType?: string;
  sourceId?: string;
  label?: string;
  href?: string;
  excerpt?: string;
};

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspaceId = await ensureDefaultWorkspace();
  const [task] = await db
    .select()
    .from(operationalJobs)
    .where(and(eq(operationalJobs.id, id), eq(operationalJobs.workspaceId, workspaceId)))
    .limit(1);

  if (!task) notFound();

  const evidence = task.evidence as Evidence[];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{formatLabel(task.jobType)}</Badge>
          <Badge variant="outline">{task.priority}</Badge>
          <Badge variant="outline">{formatLabel(task.status)}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">{task.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{task.summary}</p>
        <Link className="mt-4 inline-flex text-sm font-medium text-blue-700" href={`/workspace/voyages/${task.voyageId}`}>
          Open voyage {task.voyageId}
        </Link>
      </section>

      <TaskStatusActions currentStatus={task.status} taskId={task.id} />

      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>Source trail used to generate this operational task.</CardDescription>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <p className="text-sm text-slate-500">No evidence was attached.</p>
          ) : (
            <div className="space-y-3">
              {evidence.map((item, index) => (
                <div className="rounded-lg border border-slate-200 p-3" key={`${item.sourceType}-${item.sourceId}-${index}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.sourceType ?? "source"}</Badge>
                    {item.href ? (
                      <Link className="font-medium text-slate-950 hover:text-blue-700" href={item.href}>
                        {item.label ?? item.sourceId}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-950">{item.label ?? item.sourceId}</span>
                    )}
                  </div>
                  {item.excerpt ? <p className="mt-2 text-sm leading-6 text-slate-500">{item.excerpt}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payload</CardTitle>
          <CardDescription>Structured workflow metadata for audit and debugging.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50">{JSON.stringify(task.payload, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
