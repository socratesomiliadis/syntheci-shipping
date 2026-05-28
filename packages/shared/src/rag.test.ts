import { describe, expect, it } from "vitest";
import {
  extractCitationLabels,
  rankRetrievalCandidates,
  sourceHrefForChunk,
  validateCitationLabels,
} from "./rag";

describe("rag helpers", () => {
  it("builds chunk source links", () => {
    expect(sourceHrefForChunk({ documentId: "doc_1", id: "chunk_2" })).toBe(
      "/workspace/sources?type=file&id=doc_1&chunk=chunk_2",
    );
    expect(sourceHrefForChunk({ id: "email_chunk_1", sourceId: "EML-2026-0069", sourceType: "email" })).toBe(
      "/workspace/sources?type=email&id=EML-2026-0069&chunk=email_chunk_1",
    );
  });

  it("ranks candidates and caps repeated chunks per document", () => {
    const ranked = rankRetrievalCandidates(
      [
        {
          id: "chunk_1",
          documentId: "doc_1",
          fileName: "a.md",
          content: "alpha",
          vectorDistance: 0.1,
          keywordScore: 0.8,
        },
        {
          id: "chunk_2",
          documentId: "doc_1",
          fileName: "a.md",
          content: "beta",
          vectorDistance: 0.2,
          keywordScore: 0.7,
        },
        {
          id: "chunk_3",
          documentId: "doc_1",
          fileName: "a.md",
          content: "gamma",
          vectorDistance: 0.3,
          keywordScore: 0.6,
        },
        {
          id: "chunk_4",
          documentId: "doc_2",
          fileName: "b.md",
          content: "delta",
          vectorDistance: 0.35,
          keywordScore: 0.5,
        },
        {
          id: "EML-2026-0069",
          sourceType: "email",
          sourceId: "EML-2026-0069",
          fileName: "Dorian berth prospects",
          content: "email",
          keywordScore: 0.9,
          metadataScore: 0.2,
        },
      ],
      { limit: 4, perDocumentLimit: 2 },
    );

    expect(ranked).toHaveLength(4);
    expect(ranked.filter((chunk) => chunk.documentId === "doc_1")).toHaveLength(2);
    expect(ranked.some((chunk) => chunk.sourceType === "email")).toBe(true);
  });

  it("extracts and validates citation labels", () => {
    expect(extractCitationLabels("Alpha [1], beta [2], alpha again [1].")).toEqual(["[1]", "[2]"]);
    expect(validateCitationLabels("Alpha [1] and invented [9].", [{ rank: 1 }])).toMatchObject({
      invalidLabels: ["[9]"],
      missingCitation: false,
    });
    expect(validateCitationLabels("This answer has no citation despite being long enough to need evidence.", [{ rank: 1 }]))
      .toMatchObject({
        missingCitation: false,
      });
  });
});
