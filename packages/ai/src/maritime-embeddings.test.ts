import { describe, expect, it } from "vitest";
import {
  buildEmailEmbeddingChunks,
  buildThreadSummaryChunks,
  buildVoyageProfileChunk,
  chunkDocumentForEmbedding,
  cleanEmailBody,
} from "./maritime-embeddings";

const email = {
  email_id: "EML-1",
  thread_id: "THR-1",
  subject: "MV ATHENA / Piraeus / PDA Rev 2",
  from: "Piraeus Agent <agent@example.com>",
  to: ["Operations Greece <ops@example.com>"],
  cc: [],
  date: "2026-04-27T12:00:00Z",
  body: "Good day,<br>Please find attached PDA Revision 2. Please confirm finance approval.<br><br>Regards,<br>Agent<br>Confidentiality notice",
  related_voyage_id: "VOY-2026-018",
  related_vessel_name: "MV ATHENA",
  attachments: [
    {
      attachment_id: "ATT-1",
      original_filename: "pda-rev-2.pdf",
      document_id: "DOC-1",
      document_type: "pda",
      description: "PDA Revision 2",
    },
  ],
};

describe("maritime embedding builders", () => {
  it("cleans email bodies before embedding", () => {
    expect(cleanEmailBody(email.body)).toContain("Please find attached PDA Revision 2.");
    expect(cleanEmailBody(email.body)).not.toContain("Confidentiality notice");
    expect(cleanEmailBody(email.body)).not.toContain("Regards");
  });

  it("builds semantic email chunks with detected entities and attachments", () => {
    const chunks = buildEmailEmbeddingChunks(email);
    expect(chunks[0]?.content).toContain("Email subject: MV ATHENA");
    expect(chunks.some((chunk) => chunk.content.includes("Linked attachments:"))).toBe(true);
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));
  });

  it("builds thread summary chunks with timeline and open questions", () => {
    const chunks = buildThreadSummaryChunks("THR-1", [email]);
    expect(chunks[0]).toMatchObject({
      sourceType: "email_thread",
      sourceId: "THR-1",
      relatedVoyageId: "VOY-2026-018",
      relatedVesselName: "MV ATHENA",
    });
    expect(chunks[0]?.content).toContain("Timeline:");
    expect(chunks[0]?.content).toContain("Open questions:");
  });

  it("chunks documents by headings with maritime metadata", () => {
    const chunks = chunkDocumentForEmbedding("# Laytime and Demurrage\nLaytime shall be 72 hours SHINC.\n\n# NOR\nNOR may be tendered at anchorage.", {
      documentId: "DOC-1",
      documentType: "charterparty_excerpt",
      fileName: "cp.md",
      relatedVoyageId: "VOY-2026-018",
      relatedVesselName: "MV ATHENA",
    });
    expect(chunks[0]?.content).toContain("Section: Laytime and Demurrage");
    expect(chunks.some((chunk) => chunk.content.includes("Section: NOR"))).toBe(true);
  });

  it("builds voyage profiles as entity summaries", () => {
    const chunk = buildVoyageProfileChunk(
      {
        voyage_id: "VOY-2026-018",
        vessel_name: "MV ATHENA",
        origin_port: "Alexandria",
        destination_port: "Piraeus",
        cargo: "wheat",
        status: "awaiting_berth",
      },
      {
        openIssues: ["final SOF missing"],
        relatedDocuments: ["PDA Rev 2"],
      },
    );
    expect(chunk.content).toContain("Voyage profile: VOY-2026-018");
    expect(chunk.content).toContain("Open issues: final SOF missing");
    expect(chunk.sourceType).toBe("voyage_profile");
  });
});
