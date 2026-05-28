import { describe, expect, it } from "vitest";
import { buildCitationBlock, toCitations } from "./citations";

const chunks = [
  {
    id: "chunk_1",
    documentId: "doc_1",
    fileName: "voyage-order.txt",
    content: "MV ARGO enters EU ETS scope.",
    rank: 1,
    finalScore: 0.92,
    sourceHref: "/workspace/sources?type=file&id=doc_1&chunk=chunk_1",
  },
];

describe("citations", () => {
  it("formats retrieved chunks for grounded prompts", () => {
    expect(buildCitationBlock(chunks)).toContain("[1] voyage-order.txt");
  });

  it("maps chunks to API-safe citation records", () => {
    expect(toCitations(chunks)[0]).toMatchObject({
      sourceType: "document",
      sourceId: "doc_1",
      documentId: "doc_1",
      chunkId: "chunk_1",
      label: "[1] voyage-order.txt",
      rank: 1,
      sourceHref: "/workspace/sources?type=file&id=doc_1&chunk=chunk_1",
    });
  });

  it("maps email evidence without document chunk ids", () => {
    expect(
      toCitations([
        {
          id: "EML-2026-0069",
          sourceType: "email",
          sourceId: "EML-2026-0069",
          fileName: "AMS Dorian berth prospects",
          content: "Delay and berth update.",
          rank: 1,
          finalScore: 0.88,
          sourceHref: "/workspace/sources?type=email&id=EML-2026-0069&chunk=EML-2026-0069",
        },
      ])[0],
    ).toMatchObject({
      sourceType: "email",
      sourceId: "EML-2026-0069",
      chunkId: "EML-2026-0069",
      sourceHref: "/workspace/sources?type=email&id=EML-2026-0069&chunk=EML-2026-0069",
    });
  });
});
