import { ensureDefaultWorkspace } from "@syntheci/db";
import { AiIntelligenceConfigurationError } from "@syntheci/ai";
import { loadVoyageCockpit, generateWorkflow } from "@/lib/voyage-workflows";
import { z } from "zod";

const workflowRequestSchema = z.object({
  workflow: z.enum([
    "all",
    "missing-documents",
    "watchlist",
    "pda-fda",
    "claims-pack",
    "payment-risk",
    "reconciliation",
    "change-monitor",
    "audit",
    "action-plan",
  ]).default("all"),
});

export async function GET(_request: Request, context: { params: Promise<{ voyageId: string }> }) {
  const { voyageId } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const cockpit = await loadVoyageCockpit(workspaceId, voyageId);

  return Response.json({
    timeline: cockpit.timeline,
    missingDocumentDrafts: cockpit.missingDocumentDrafts,
    watchlistDrafts: cockpit.watchlistDrafts,
    charterpartyClauses: cockpit.charterpartyClauses,
    draftReply: cockpit.draftReply,
    pdaFdaDrafts: cockpit.pdaFdaDrafts,
    claimsPackDrafts: cockpit.claimsPackDrafts,
    paymentRiskDrafts: cockpit.paymentRiskDrafts,
  });
}

export async function POST(request: Request, context: { params: Promise<{ voyageId: string }> }) {
  const { voyageId } = await context.params;
  const workspaceId = await ensureDefaultWorkspace();
  const input = workflowRequestSchema.parse(await request.json().catch(() => ({})));
  try {
    const jobs = await generateWorkflow(workspaceId, voyageId, input.workflow);
    return Response.json({ jobs });
  } catch (error) {
    if (error instanceof AiIntelligenceConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
}
