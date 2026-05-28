import { ingestDemoData, ingestDemoDataInputSchema } from "@/lib/demo-data-ingestion";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => undefined);
    const input = ingestDemoDataInputSchema.parse(body);
    const result = await ingestDemoData(input);

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Demo data ingestion failed" }, { status: 500 });
  }
}
