import { ensureDefaultWorkspace } from "@syntheci/db";
import { generateWorkflow, voyageIdsForWorkspace } from "@/lib/voyage-workflows";
import { revalidatePath } from "next/cache";

export async function POST() {
  const workspaceId = await ensureDefaultWorkspace();
  const voyageIds = await voyageIdsForWorkspace(workspaceId);
  const results = [];

  for (const voyageId of voyageIds) {
    const jobs = await generateWorkflow(workspaceId, voyageId, "watchlist");
    results.push({ voyageId, jobCount: jobs.length });
  }

  revalidatePath("/workspace/admin");
  revalidatePath("/workspace/voyages");
  revalidatePath("/workspace/tasks");
  revalidatePath("/workspace");

  return Response.json({ results });
}
