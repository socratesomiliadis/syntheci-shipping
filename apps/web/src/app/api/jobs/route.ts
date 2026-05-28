import { db, ensureDefaultWorkspace, operationalJobs } from "@syntheci/db";
import { upsertOperationalJobSchema } from "@syntheci/shared";
import { loadOperationalJobs } from "@/lib/voyage-workflows";

export async function GET(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const params = new URL(request.url).searchParams;
  const jobs = await loadOperationalJobs(
    workspaceId,
    params.get("status") ?? undefined,
    params.get("voyageId") ?? undefined,
  );

  return Response.json({ jobs });
}

export async function POST(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const input = upsertOperationalJobSchema.parse(await request.json());
  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(operationalJobs).values({
    id,
    workspaceId,
    voyageId: input.voyageId,
    jobType: input.jobType,
    status: input.status,
    priority: input.priority,
    title: input.title,
    summary: input.summary,
    evidence: input.evidence,
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id }, { status: 201 });
}
