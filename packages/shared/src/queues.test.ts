import { describe, expect, it } from "vitest";
import { automationJobSchema, ingestionJobSchema, QUEUES } from "./queues";

describe("queue contracts", () => {
  it("keeps queue names stable", () => {
    expect(QUEUES.ingestion).toBe("syntheci.ingestion");
    expect(QUEUES.automation).toBe("syntheci.automation");
  });

  it("validates ingestion payloads", () => {
    const payload = ingestionJobSchema.parse({
      documentId: "doc_1",
      workspaceId: "workspace_1",
      objectKey: "workspace_1/doc_1/demo.txt",
      fileName: "demo.txt",
    });

    expect(payload.documentId).toBe("doc_1");
  });

  it("validates automation payloads", () => {
    expect(() =>
      automationJobSchema.parse({
        automationRuleId: "rule_1",
        workspaceId: "workspace_1",
        runId: "run_1",
        question: "",
      }),
    ).toThrow();
  });
});
