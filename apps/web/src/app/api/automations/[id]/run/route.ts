import { automationQueue } from "@/lib/queues";
import { automationRules, automationRuns, db, ensureDefaultWorkspace, queueJobs } from "@syntheci/db";
import { QUEUES } from "@syntheci/shared";
import { eq } from "drizzle-orm";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);

  if (!rule) {
    return Response.json({ error: "Automation rule not found" }, { status: 404 });
  }

  const runId = crypto.randomUUID();
  await db.insert(automationRuns).values({
    id: runId,
    automationRuleId: id,
    workspaceId,
    status: "queued",
  });

  const job = await automationQueue().add("manual-automation", {
    automationRuleId: id,
    workspaceId,
    runId,
    question: rule.question,
    kind: "brief",
  });

  await db.insert(queueJobs).values({
    id: crypto.randomUUID(),
    queueName: QUEUES.automation,
    jobId: String(job.id),
    workspaceId,
    automationRunId: runId,
    status: "queued",
    payload: job.data,
  });

  return Response.json({ runId, jobId: job.id });
}
