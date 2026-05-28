import { ensureDefaultWorkspace } from "@syntheci/db";
import { generateWorkflow, voyageIdsForWorkspace } from "@/lib/voyage-workflows";

export async function POST() {
  const workspaceId = await ensureDefaultWorkspace();
  const voyageIds = await voyageIdsForWorkspace(workspaceId);
  const results = [];

  for (const voyageId of voyageIds) {
    const jobs = await generateWorkflow(workspaceId, voyageId, "watchlist");
    results.push({ voyageId, jobCount: jobs.length });
  }

  return Response.json({ results });
}
