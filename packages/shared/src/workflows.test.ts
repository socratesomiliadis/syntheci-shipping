import { describe, expect, it } from "vitest";
import {
  buildClaimsEvidencePack,
  buildTimeline,
  buildWatchlistJobs,
  comparePdaFda,
  detectMissingDocuments,
  detectPaymentRisk,
  draftReply,
  extractCharterpartyClauses,
  type WorkflowContext,
} from "./workflows";

const baseContext: WorkflowContext = {
  voyage: {
    id: "VOY-2026-0523",
    vesselName: "AMS Dorian",
    originPort: "Sirocco Bulk Terminal",
    destinationPort: "Kydonia Container Quay",
    cargo: "Steel coils",
    eta: "2026-05-29T09:00:00Z",
    status: "active",
  },
  documents: [
    {
      id: "doc-cp",
      fileName: "charterparty.md",
      documentType: "charterparty_excerpt",
      sourceCreatedAt: "2026-05-23T09:00:00Z",
      content: "Laycan: 2026-05-22 to 2026-05-24. NOR may be tendered at anchorage. Demurrage applies after laytime. EU ETS costs for charterers.",
    },
    {
      id: "doc-pda",
      fileName: "pda-rev-2.pdf",
      documentType: "pda",
      sourceCreatedAt: "2026-05-24T09:00:00Z",
      content: "PDA Revision 2. Finance review pending before remittance.",
    },
    {
      id: "doc-claim",
      fileName: "claims-note.md",
      documentType: "claims_note",
      sourceCreatedAt: "2026-05-25T09:00:00Z",
      content: "Claims note says do not share laytime position until final SOF is signed.",
    },
  ],
  emails: [
    {
      id: "EML-1",
      threadId: "THR-1",
      subject: "PDA Rev 2 for finance review",
      from: "ops@example.test",
      sentAt: "2026-05-24T10:00:00Z",
      body: "Finance review is pending before we confirm the agent funding request.",
      attachments: [],
    },
  ],
  events: [
    {
      id: "EVT-1",
      eventType: "berth_delay",
      eventTime: "2026-05-24T08:00:00Z",
      severity: "high",
      description: "Berth delay and anchorage waiting time may affect laytime.",
    },
  ],
  complianceFlag: {
    id: "FLAG-1",
    euEtsExposure: true,
    fueleuRisk: true,
    mrvMissingData: true,
    ciiRisk: false,
    riskScore: 86,
    riskLevel: "high",
    rationale: ["EU ETS exposure active", "MRV fuel data missing"],
    lastEvaluatedAt: "2026-05-24T07:00:00Z",
  },
  aisPositions: [
    {
      id: "AIS-1",
      positionTimestamp: "2026-05-24T06:00:00Z",
      destination: "Kydonia",
      eta: "2026-05-29T09:00:00Z",
      speedKnots: 11.2,
    },
  ],
};

describe("workflow helpers", () => {
  it("detects required missing documents from voyage risk context", () => {
    const jobs = detectMissingDocuments(baseContext);
    expect(jobs.map((job) => job.payload.missingDocumentType)).toContain("voyage_order");
    expect(jobs.map((job) => job.payload.missingDocumentType)).toContain("statement_of_facts");
    expect(jobs.map((job) => job.payload.missingDocumentType)).not.toContain("charterparty_excerpt");
  });

  it("builds watchlist jobs from high compliance and voyage events", () => {
    const jobs = buildWatchlistJobs(baseContext);
    expect(jobs.some((job) => job.jobType === "watchlist_risk" && job.priority === "high")).toBe(true);
    expect(jobs.some((job) => job.jobType === "watchlist_event")).toBe(true);
  });

  it("extracts charterparty clauses into stable cards", () => {
    const clauses = extractCharterpartyClauses(baseContext);
    expect(clauses.map((clause) => clause.key)).toEqual([
      "laycan",
      "nor",
      "demurrage",
      "documents",
      "ets_fueleu",
      "exceptions",
    ]);
    expect(clauses.find((clause) => clause.key === "laycan")?.text).toContain("Laycan");
  });

  it("orders timeline items newest first", () => {
    const timeline = buildTimeline(baseContext);
    expect(timeline[0]?.id).toBe("doc-claim");
    expect(timeline.map((item) => Date.parse(item.timestamp))).toEqual(
      [...timeline].map((item) => Date.parse(item.timestamp)).sort((left, right) => right - left),
    );
  });

  it("creates PDA/FDA comparison and payment-risk jobs", () => {
    expect(comparePdaFda(baseContext)[0]?.priority).toBe("high");
    expect(detectPaymentRisk(baseContext)[0]?.jobType).toBe("payment_risk");
  });

  it("creates claims evidence pack and draft reply", () => {
    expect(buildClaimsEvidencePack(baseContext)[0]?.evidence.length).toBeGreaterThan(0);
    expect(draftReply(baseContext).body).toContain("VOY-2026-0523");
  });
});
