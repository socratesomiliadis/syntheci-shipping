import { automationQueue } from "@/lib/queues";
import { automationRules, automationRuns, db, ensureDefaultWorkspace, queueJobs } from "@syntheci/db";
import { createAutomationSchema, parseWorkflowIntent, QUEUES } from "@syntheci/shared";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function GET() {
  const workspaceId = await ensureDefaultWorkspace();
  const [rules, runs] = await Promise.all([
    db
      .select()
      .from(automationRules)
      .where(eq(automationRules.workspaceId, workspaceId))
      .orderBy(desc(automationRules.createdAt)),
    db
      .select({
        id: automationRuns.id,
        status: automationRuns.status,
        summary: automationRuns.summary,
        error: automationRuns.error,
        createdAt: automationRuns.createdAt,
        completedAt: automationRuns.completedAt,
        ruleName: automationRules.name,
      })
      .from(automationRuns)
      .innerJoin(automationRules, eq(automationRuns.automationRuleId, automationRules.id))
      .where(eq(automationRuns.workspaceId, workspaceId))
      .orderBy(desc(automationRuns.createdAt))
      .limit(8),
  ]);

  return Response.json({ rules, runs });
}

export async function POST(request: Request) {
  const body = await request.json();
  const input = createAutomationSchema.parse(body);
  const parsedIntent = parseWorkflowIntent(input.question);
  const cadence = body.cadence ? input.cadence : parsedIntent.cadence;
  const workflow = input.workflow ?? parsedIntent.workflow;
  const voyageId = input.voyageId ?? parsedIntent.voyageId;
  const workspaceId = await ensureDefaultWorkspace();
  const ruleId = crypto.randomUUID();

  await db.insert(automationRules).values({
    id: ruleId,
    workspaceId,
    name: input.name,
    question: input.question,
    cadence,
  });

  if (cadence !== "manual") {
    const runId = crypto.randomUUID();
    await db.insert(automationRuns).values({
      id: runId,
      automationRuleId: ruleId,
      workspaceId,
      status: "queued",
    });
    const job = await automationQueue().add(
      "scheduled-automation",
      workflow === "watchlist" && parsedIntent.confidence < 0.8
        ? { automationRuleId: ruleId, workspaceId, runId, question: input.question, kind: "brief" }
        : { automationRuleId: ruleId, workspaceId, runId, kind: "workflow", workflow, voyageId },
      { repeat: repeatForCadence(cadence) },
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
  }

  revalidatePath("/workspace/automations");
  revalidatePath("/workspace");

  return Response.json({ ruleId, parsedIntent: { ...parsedIntent, workflow, voyageId, cadence } }, { status: 201 });
}

function repeatForCadence(cadence: "hourly" | "daily" | "weekly") {
  if (cadence === "hourly") return { every: 60 * 60 * 1000 };
  if (cadence === "daily") return { pattern: "0 7 * * *" };
  return { pattern: "0 7 * * 1" };
}
