export type RetrievalSourceType =
  | "document"
  | "email"
  | "email_thread"
  | "vessel_profile"
  | "voyage_profile"
  | "contact_profile"
  | "structured_record"
  | "scenario_profile";

export interface RetrievalCandidate {
  id: string;
  sourceType?: RetrievalSourceType;
  sourceId?: string;
  documentId?: string;
  fileName: string;
  content: string;
  vectorDistance?: number | null;
  keywordScore?: number | null;
  metadataScore?: number | null;
  documentType?: string | null;
  voyageId?: string | null;
  vesselName?: string | null;
}

export interface RankedRetrievalChunk extends RetrievalCandidate {
  rank: number;
  finalScore: number;
  sourceHref: string;
}

export interface RagCitation {
  sourceType: RetrievalSourceType;
  sourceId: string;
  documentId?: string;
  chunkId?: string;
  label: string;
  excerpt: string;
  rank: number;
  finalScore: number;
  vectorDistance?: number;
  keywordScore?: number;
  documentType?: string;
  voyageId?: string;
  vesselName?: string;
  sourceHref: string;
  fileName: string;
}

export interface CitationValidation {
  usedLabels: string[];
  invalidLabels: string[];
  missingCitation: boolean;
}

export function sourceHrefForChunk(
  chunk: Pick<RetrievalCandidate, "documentId" | "id" | "sourceType" | "sourceId">,
) {
  const sourceType = chunk.sourceType ?? "document";
  const params = new URLSearchParams({
    type: sourceType === "document" ? "file" : sourceType,
    id: sourceType === "document" ? chunk.documentId ?? chunk.sourceId ?? chunk.id : chunk.sourceId ?? chunk.id,
    chunk: chunk.id,
  });
  return `/workspace/sources?${params.toString()}`;
}

export function rankRetrievalCandidates(
  candidates: RetrievalCandidate[],
  {
    limit = 8,
    perDocumentLimit = 2,
  }: {
    limit?: number;
    perDocumentLimit?: number;
  } = {},
): RankedRetrievalChunk[] {
  const maxKeywordScore = Math.max(0, ...candidates.map((candidate) => candidate.keywordScore ?? 0));
  const scored = candidates.map((candidate) => {
    const vectorScore =
      typeof candidate.vectorDistance === "number"
        ? Math.max(0, Math.min(1, 1 - candidate.vectorDistance / 2))
        : 0;
    const keywordScore =
      maxKeywordScore > 0 ? Math.max(0, (candidate.keywordScore ?? 0) / maxKeywordScore) : 0;
    const metadataScore = Math.max(0, Math.min(0.2, candidate.metadataScore ?? 0));
    const finalScore = vectorScore * 0.7 + keywordScore * 0.25 + metadataScore;

    return {
      ...candidate,
      finalScore: Number(finalScore.toFixed(6)),
      sourceHref: sourceHrefForChunk(candidate),
    };
  });

  const sourceCounts = new Map<string, number>();
  const ranked: RankedRetrievalChunk[] = [];

  for (const candidate of scored.sort((left, right) => right.finalScore - left.finalScore)) {
    const sourceKey = [
      candidate.sourceType ?? "document",
      candidate.documentId ?? candidate.sourceId ?? candidate.id,
    ].join(":");
    const count = sourceCounts.get(sourceKey) ?? 0;
    if (count >= perDocumentLimit) continue;
    sourceCounts.set(sourceKey, count + 1);
    ranked.push({ ...candidate, rank: ranked.length + 1 });
    if (ranked.length >= limit) break;
  }

  return ranked;
}

export function extractCitationLabels(text: string) {
  return [...new Set([...text.matchAll(/\[(\d+)\]/g)].map((match) => `[${match[1]}]`))];
}

export function validateCitationLabels(text: string, citations: Pick<RagCitation, "rank">[]): CitationValidation {
  const usedLabels = extractCitationLabels(text);
  const validLabels = new Set(citations.map((citation) => `[${citation.rank}]`));
  const invalidLabels = usedLabels.filter((label) => !validLabels.has(label));
  const missingCitation = citations.length > 0 && text.trim().length > 80 && usedLabels.length === 0;

  return { usedLabels, invalidLabels, missingCitation };
}
