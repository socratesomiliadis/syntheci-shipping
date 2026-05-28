import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadVoyageSummaries } from "@/lib/voyage-workflows";

export async function GET(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const voyages = await loadVoyageSummaries(workspaceId, query);

  return Response.json({ voyages });
}
