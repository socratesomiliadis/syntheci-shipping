import { ensureDefaultWorkspace } from "@syntheci/db";
import { loadVoyageCockpit } from "@/lib/voyage-workflows";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();

  try {
    const voyage = await loadVoyageCockpit(workspaceId, id);
    return Response.json(voyage);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Voyage not found" }, { status: 404 });
  }
}
