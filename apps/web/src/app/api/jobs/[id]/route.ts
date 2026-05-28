import { db, ensureDefaultWorkspace, operationalJobs } from "@syntheci/db";
import { updateOperationalJobSchema } from "@syntheci/shared";
import { and, eq } from "drizzle-orm";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const [job] = await db
    .select()
    .from(operationalJobs)
    .where(and(eq(operationalJobs.id, id), eq(operationalJobs.workspaceId, workspaceId)))
    .limit(1);

  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ job });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const input = updateOperationalJobSchema.parse(await request.json());

  await db
    .update(operationalJobs)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(operationalJobs.id, id), eq(operationalJobs.workspaceId, workspaceId)));

  return Response.json({ id });
}
