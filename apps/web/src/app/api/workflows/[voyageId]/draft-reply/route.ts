import { ensureDefaultWorkspace } from "@syntheci/db";
import { draftReply } from "@syntheci/shared";
import { loadWorkflowContext } from "@/lib/voyage-workflows";

export async function GET(_request: Request, context: { params: Promise<{ voyageId: string }> }) {
  const { voyageId } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const workflowContext = await loadWorkflowContext(workspaceId, voyageId);

  return Response.json({ draftReply: draftReply(workflowContext) });
}
