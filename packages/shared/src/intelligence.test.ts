import { describe, expect, it } from "vitest";
import {
  buildAuditChecks,
  buildClaimsPackSummary,
  buildReconciliationFindings,
  compareVoyageSnapshots,
  extractDocumentFields,
  parseWorkflowIntent,
  scoreSourceConfidence,
  type WorkflowContext,
} from "./index";

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
      id: "DOC-PDA",
      fileName: "pda.md",
      documentType: "pda",
      sourceCreatedAt: "2026-05-23T09:00:00Z",
      content: "PDA total USD 42,500. Finance review pending for port dues.",
    },
    {
      id: "DOC-CP",
      fileName: "charterparty.md",
      documentType: "charterparty_excerpt",
      sourceCreatedAt: "2026-05-22T09:00:00Z",
      content: "Laycan: 2026-05-22 to 2026-05-24. Demurrage applies after laytime. EU ETS costs for charterers.",
    },
    {
      id: "DOC-BDN",
      fileName: "bdn.md",
      documentType: "bunker_fuel_document",
      sourceCreatedAt: "2026-05-21T09:00:00Z",
      content: "BDN supplier: Helios Fuels. Fuel type VLSFO. Quantity 100 mt. Sulfur 0.5%.",
    },
  ],
  emails: [
    {
      id: "EML-1",
      threadId: "THR-1",
      subject: "PDA and final disbursement",
      from: "agent@example.test",
      sentAt: "2026-05-24T10:00:00Z",
      body: "Please confirm FDA remains pending before remittance.",
      attachments: [{ document_id: "DOC-MISSING", document_type: "fda" }],
    },
  ],
  events: [
    {
      id: "EVT-1",
      eventType: "delay_event",
      eventTime: "2026-05-24T08:00:00Z",
      severity: "medium",
      description: "Berth delay and anchorage waiting time may affect laytime.",
    },
  ],
  complianceFlag: {
    id: "CFL-1",
    euEtsExposure: true,
    fueleuRisk: false,
    mrvMissingData: true,
    ciiRisk: false,
    riskScore: 76,
    riskLevel: "high",
    rationale: ["EU ETS exposure active", "MRV fuel data missing"],
    lastEvaluatedAt: "2026-05-24T07:00:00Z",
  },
  aisPositions: [
    {
      id: "AIS-1",
      positionTimestamp: "2026-05-24T06:00:00Z",
      destination: "Sirocco Bulk Terminal",
      eta: "2026-05-30T12:00:00Z",
      speedKnots: 10.1,
    },
  ],
  bunkerReports: [
    {
      id: "BINV-1",
      vessel: "AMS Dorian",
      voyageId: "VOY-2026-0523",
      fuelType: "VLSFO",
      quantityMt: 140,
      sulfurPct: 0.5,
      co2Factor: 3.114,
      port: "Nereid Bay Port",
      supplier: "Helios Fuels",
      invoiceDate: "2026-05-21",
    },
  ],
};

describe("maritime intelligence helpers", () => {
  it("extracts document fields by document type", () => {
    const extractions = extractDocumentFields(context);
    expect(extractions.find((item) => item.documentId === "DOC-PDA")?.fields.some((field) => field.name === "amount")).toBe(true);
    expect(extractions.find((item) => item.documentId === "DOC-CP")?.fields.some((field) => field.name === "laycan")).toBe(true);
    expect(extractions.find((item) => item.documentId === "DOC-BDN")?.fields.some((field) => field.name === "quantity_mt")).toBe(true);
  });

  it("detects reconciliation findings for PDA/FDA, bunker, ETA, and attachments", () => {
    const findings = buildReconciliationFindings(context);
    expect(findings.map((finding) => finding.findingType)).toEqual(
      expect.arrayContaining(["eta_mismatch", "pda_fda_gap", "bunker_mismatch", "email_attachment_gap"]),
    );
    expect(findings.some((finding) => finding.confidence >= 0.75)).toBe(true);
  });

  it("scores source confidence and builds audit checks", () => {
    expect(scoreSourceConfidence("file", "statement_of_facts").level).toBe("primary");
    const checks = buildAuditChecks(context);
    expect(checks.some((check) => !check.passed && check.key === "primary_docs")).toBe(true);
  });

  it("builds claims pack summary with charterparty and delay evidence", () => {
    const pack = buildClaimsPackSummary(context);
    expect(pack.summary).toContain("charterparty");
    expect(pack.evidence.some((item) => item.sourceType === "voyage_event")).toBe(true);
  });

  it("parses natural-language workflow requests", () => {
    expect(parseWorkflowIntent("Every morning reconcile PDA and FDA for VOY-2026-0523")).toMatchObject({
      workflow: "reconciliation",
      cadence: "daily",
      scope: "single-voyage",
      voyageId: "VOY-2026-0523",
    });
  });

  it("detects snapshot changes", () => {
    const change = compareVoyageSnapshots(context, {
      stateHash: "old",
      state: { latestAisEta: "2026-05-29T09:00:00Z", latestEmailId: "EML-0", riskScore: 10, riskLevel: "low" },
    });
    expect(change.changes.length).toBeGreaterThan(0);
  });
});
