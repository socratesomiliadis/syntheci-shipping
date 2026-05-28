import type { RagCitation, RankedRetrievalChunk } from "@syntheci/shared";
import { validateCitationLabels } from "@syntheci/shared";

export type RetrievedChunk = RankedRetrievalChunk;
export type Citation = RagCitation;
export { validateCitationLabels };

export function buildCitationBlock(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk) => {
      const label = `[${chunk.rank}] ${chunk.fileName}`;
      const metadata = [
        `source: ${chunk.sourceType ?? "document"}`,
        chunk.documentType ? `type: ${chunk.documentType}` : undefined,
        chunk.voyageId ? `voyage: ${chunk.voyageId}` : undefined,
        chunk.vesselName ? `vessel: ${chunk.vesselName}` : undefined,
        `rank_score: ${chunk.finalScore.toFixed(3)}`,
      ]
        .filter(Boolean)
        .join(" | ");
      return `${label}\n${metadata}\n${chunk.content}`;
    })
    .join("\n\n");
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((chunk) => {
    const sourceType = chunk.sourceType ?? "document";
    const sourceId = chunk.sourceId ?? chunk.documentId ?? chunk.id;

    return {
      sourceType,
      sourceId,
      documentId: chunk.documentId,
      chunkId: chunk.id,
      label: `[${chunk.rank}] ${chunk.fileName}`,
      excerpt: chunk.content.slice(0, 320),
      fileName: chunk.fileName,
      finalScore: chunk.finalScore,
      keywordScore: chunk.keywordScore ?? undefined,
      rank: chunk.rank,
      sourceHref: chunk.sourceHref,
      vectorDistance: chunk.vectorDistance ?? undefined,
      documentType: chunk.documentType ?? undefined,
      vesselName: chunk.vesselName ?? undefined,
      voyageId: chunk.voyageId ?? undefined,
    };
  });
}
