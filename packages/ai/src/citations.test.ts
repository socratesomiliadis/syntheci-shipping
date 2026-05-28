import { describe, expect, it } from "vitest";
import { buildCitationBlock, toCitations } from "./citations";

const chunks = [
  {
    id: "chunk_1",
    documentId: "doc_1",
    fileName: "voyage-order.txt",
    content: "MV ARGO enters EU ETS scope.",
  },
];

describe("citations", () => {
  it("formats retrieved chunks for grounded prompts", () => {
    expect(buildCitationBlock(chunks)).toContain("[1] voyage-order.txt");
  });

  it("maps chunks to API-safe citation records", () => {
    expect(toCitations(chunks)[0]).toMatchObject({
      documentId: "doc_1",
      chunkId: "chunk_1",
      label: "[1] voyage-order.txt",
    });
  });
});
