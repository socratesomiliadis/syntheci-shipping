import { AiIntelligenceConfigurationError } from "@syntheci/ai";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { revalidatePath } from "next/cache";
import { injectAmsDorianLiveDemoEvent } from "@/lib/live-demo-events";
import { generateWorkflowForSources, tagWorkflowRunJobs } from "@/lib/voyage-workflows";

export const runtime = "nodejs";

const liveDemoAiWorkflow = "all";

export async function POST() {
  const workspaceId = await ensureDefaultWorkspace();
  const result = await injectAmsDorianLiveDemoEvent(workspaceId);
  const workflowRunId = crypto.randomUUID();
  const startedAt = new Date();
  let taggedJobs = [];

  try {
    await generateWorkflowForSources(workspaceId, result.voyageId, liveDemoAiWorkflow, result.sourceIds);
    taggedJobs = await tagWorkflowRunJobs(workspaceId, result.voyageId, workflowRunId, startedAt, {
      source: "live-demo",
      workflow: liveDemoAiWorkflow,
      scopedToSources: result.sourceIds,
    });
  } catch (error) {
    if (error instanceof AiIntelligenceConfigurationError) {
      return Response.json({ error: error.message, result }, { status: 503 });
    }
    throw error;
  }

  revalidatePath(`/workspace/voyages/${result.voyageId}`);
  revalidatePath("/workspace/voyages");
  revalidatePath("/workspace/tasks");
  revalidatePath("/workspace/sources");
  revalidatePath("/workspace");

  return Response.json({
    ...result,
    ai: {
      workflowRunId,
      workflow: liveDemoAiWorkflow,
      tasksCreated: taggedJobs.length,
    },
  }, { status: 201 });
}
