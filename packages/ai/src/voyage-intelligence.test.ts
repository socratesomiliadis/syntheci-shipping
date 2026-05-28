import { describe, expect, it } from "vitest";
import {
  AiIntelligenceConfigurationError,
  buildVoyageEvidenceRegistry,
  validateVoyageIntelligenceOutput,
} from "./voyage-intelligence";
import type { WorkflowContext } from "@syntheci/shared";

const context: WorkflowContext = {
  voyage: {
    id: "VOY-2026-0523",
    vesselName: "AMS Dorian",
    originPort: "Nereid Bay Port",
    destinationPort: "Sirocco Bulk Terminal",
    cargo: "Clinker",
    eta: "2026-05-29T09:00:00Z",
    status: "in_transit",
  },
  documents: [
    {
      id: "DOC-1",
      fileName: "pda.md",
      documentType: "pda",
      sourceCreatedAt: "2026-05-23T09:00:00Z",
      content: "PDA total USD 42,500. Finance review pending for port dues.",
    },
  ],
  emails: [
    {
      id: "EML-1",
      threadId: "THR-1",
      subject: "FDA pending",
      from: "agent@example.test",
      sentAt: "2026-05-24T10:00:00Z",
      body: "Please confirm FDA remains pending before remittance.",
      attachments: [],
    },
  ],
  events: [],
  complianceFlag: null,
  aisPositions: [],
  bunkerReports: [],
};

describe("voyage AI intelligence validation", () => {
  it("accepts jobs and findings backed by known evidence", () => {
    const registry = buildVoyageEvidenceRegistry(context);
    const output = validateVoyageIntelligenceOutput(
      {
        runSummary: "Finance evidence needs review.",
        riskAssessment: {
          riskScore: 74,
          riskLevel: "high",
          summary: "Pending FDA creates payment release risk.",
          rationale: ["The agent email says FDA remains pending before remittance."],
          confidence: 0.86,
          evidenceRefs: ["email:EML-1"],
          payload: {},
        },
        jobs: [
          {
            jobType: "payment review",
            priority: "high",
            title: "Confirm FDA before remittance",
            summary: "The agent email says FDA remains pending before remittance.",
            suggestedAction: "Request the FDA before payment release.",
            confidence: 0.88,
            evidenceRefs: ["email:EML-1"],
            payload: {},
          },
        ],
        findings: [
          {
            findingType: "payment_gap",
            severity: "medium",
            confidence: 0.82,
            title: "FDA pending",
            summary: "FDA remains pending before remittance.",
            suggestedAction: "Request final disbursement evidence.",
            evidenceRefs: ["email:EML-1"],
            payload: {},
          },
        ],
      },
      registry,
      { model: "test-model", voyageId: "VOY-2026-0523", workflow: "all" },
    );

    expect(output.jobs).toHaveLength(1);
    expect(output.jobs[0]?.jobType).toBe("payment_review");
    expect(output.jobs[0]?.payload).toMatchObject({ generatedBy: "ai", model: "test-model", runSummary: "Finance evidence needs review." });
    expect(output.riskAssessment).toMatchObject({ riskScore: 74, riskLevel: "high" });
    expect(output.findings).toHaveLength(2);
    expect(output.findings[0]?.findingType).toBe("risk_assessment");
  });

  it("drops jobs and findings without known evidence", () => {
    const registry = buildVoyageEvidenceRegistry(context);
    const output = validateVoyageIntelligenceOutput(
      {
        runSummary: "Unsupported claims were removed.",
        riskAssessment: {
          riskScore: 66,
          riskLevel: "medium",
          summary: "Unsupported risk.",
          rationale: ["No known source."],
          confidence: 0.7,
          evidenceRefs: ["file:DOES-NOT-EXIST"],
          payload: {},
        },
        jobs: [
          {
            jobType: "unsupported",
            priority: "medium",
            title: "Unsupported job",
            summary: "This has no known source.",
            suggestedAction: "Do something.",
            confidence: 0.7,
            evidenceRefs: ["file:DOES-NOT-EXIST"],
            payload: {},
          },
        ],
        findings: [
          {
            findingType: "unsupported",
            severity: "medium",
            confidence: 0.7,
            title: "Unsupported finding",
            summary: "This has no known source.",
            suggestedAction: "Do something.",
            evidenceRefs: ["file:DOES-NOT-EXIST"],
            payload: {},
          },
        ],
      },
      registry,
      { model: "test-model", voyageId: "VOY-2026-0523", workflow: "all" },
    );

    expect(output.jobs).toHaveLength(0);
    expect(output.findings).toHaveLength(0);
    expect(output.riskAssessment).toBeNull();
    expect(output.dropped).toEqual({ jobs: 1, findings: 1, riskAssessments: 1 });
  });

  it("exposes a clear missing-provider error", () => {
    expect(new AiIntelligenceConfigurationError("AI intelligence is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY.").message).toContain(
      "GOOGLE_GENERATIVE_AI_API_KEY",
    );
  });
});
