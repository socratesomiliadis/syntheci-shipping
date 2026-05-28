import { automationQueue } from "@/lib/queues";
import { automationRules, automationRuns, db, ensureDefaultWorkspace, queueJobs } from "@syntheci/db";
import { QUEUES } from "@syntheci/shared";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const watchlistName = "Daily voyage watchlist";
const watchlistQuestion = "Generate operational tasks for active voyage risk, missing documents, claims, payment, and compliance changes.";

export async function POST() {
  const workspaceId = await ensureDefaultWorkspace();
  const [existingRule] = await db
    .select()
    .from(automationRules)
    .where(and(eq(automationRules.workspaceId, workspaceId), eq(automationRules.name, watchlistName)))
    .limit(1);

  const ruleId = existingRule?.id ?? crypto.randomUUID();
  if (!existingRule) {
    await db.insert(automationRules).values({
      id: ruleId,
      workspaceId,
      name: watchlistName,
      question: watchlistQuestion,
      cadence: "daily",
    });
  }

  const runId = crypto.randomUUID();
  await db.insert(automationRuns).values({
    id: runId,
    automationRuleId: ruleId,
    workspaceId,
    status: "queued",
  });

  const job = await automationQueue().add(
    "daily-voyage-watchlist",
    {
      automationRuleId: ruleId,
      workspaceId,
      runId,
      kind: "workflow",
      workflow: "watchlist",
    },
    {
      jobId: `daily-voyage-watchlist:${workspaceId}`,
      repeat: { pattern: "0 7 * * *" },
    },
  );

  await db.insert(queueJobs).values({
    id: crypto.randomUUID(),
    queueName: QUEUES.automation,
    jobId: String(job.id),
    workspaceId,
    automationRunId: runId,
    status: "queued",
    payload: job.data,
  });

  revalidatePath("/workspace/admin");
  revalidatePath("/workspace/automations");
  revalidatePath("/workspace");

  return Response.json({ ruleId, runId, jobId: job.id });
}
