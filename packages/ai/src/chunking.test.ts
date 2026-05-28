import { describe, expect, it } from "vitest";
import { chunkText } from "./chunking";

describe("chunkText", () => {
  it("creates overlapping chunks with stable indexes", () => {
    const text = Array.from({ length: 80 }, (_, index) => `Sentence ${index}.`).join(" ");
    const chunks = chunkText(text, 120, 20);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));
    expect(chunks[0]?.content).toContain("Sentence 0");
  });

  it("returns no chunks for blank input", () => {
    expect(chunkText(" \n\n ")).toEqual([]);
  });
});
