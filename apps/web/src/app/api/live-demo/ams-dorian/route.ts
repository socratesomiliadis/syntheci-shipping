import { AiIntelligenceConfigurationError } from "@syntheci/ai";
import { ensureDefaultWorkspace } from "@syntheci/db";
import { revalidatePath } from "next/cache";
import { injectAmsDorianLiveDemoEvent } from "@/lib/live-demo-events";
import { generateWorkflow } from "@/lib/voyage-workflows";

export const runtime = "nodejs";

const liveDemoAiWorkflows = ["change-monitor", "claims-pack", "pda-fda", "action-plan"] as const;

export async function POST() {
  const workspaceId = await ensureDefaultWorkspace();
  const result = await injectAmsDorianLiveDemoEvent(workspaceId);
  const jobsByWorkflow = [];

  try {
    for (const workflow of liveDemoAiWorkflows) {
      const jobs = await generateWorkflow(workspaceId, result.voyageId, workflow);
      jobsByWorkflow.push({ workflow, jobsAvailable: jobs.length });
    }
  } catch (error) {
    if (error instanceof AiIntelligenceConfigurationError) {
      return Response.json({ error: error.message, result }, { status: 503 });
    }
    throw error;
  }

  revalidatePath(`/workspace/voyages/${result.voyageId}`);
  revalidatePath("/workspace/voyages");
  revalidatePath("/workspace/jobs");
  revalidatePath("/workspace/sources");
  revalidatePath("/workspace");

  return Response.json({
    ...result,
    ai: {
      workflows: liveDemoAiWorkflows,
      jobsAvailable: jobsByWorkflow.at(-1)?.jobsAvailable ?? 0,
    },
  }, { status: 201 });
}
