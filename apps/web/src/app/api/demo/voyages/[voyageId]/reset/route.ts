import { ensureDefaultWorkspace } from "@syntheci/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resetVoyageDemoState } from "@/lib/demo-voyage-reset";

export const runtime = "nodejs";

const resetRequestSchema = z.object({
  includeLiveSources: z.boolean().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ voyageId: string }> }) {
  const { voyageId } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const input = resetRequestSchema.parse(await request.json().catch(() => ({})));
  const result = await resetVoyageDemoState(workspaceId, voyageId, input);

  revalidatePath(`/workspace/voyages/${voyageId}`);
  revalidatePath("/workspace/voyages");
  revalidatePath("/workspace/tasks");
  revalidatePath("/workspace/sources");
  revalidatePath("/workspace");

  return Response.json(result);
}
