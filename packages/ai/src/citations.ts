export interface RetrievedChunk {
  id: string;
  documentId: string;
  fileName: string;
  content: string;
  score?: number;
}

export interface Citation {
  documentId: string;
  chunkId: string;
  label: string;
  excerpt: string;
}

export function buildCitationBlock(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => {
      const label = `[${index + 1}] ${chunk.fileName}`;
      return `${label}\n${chunk.content}`;
    })
    .join("\n\n");
}

export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((chunk, index) => ({
    documentId: chunk.documentId,
    chunkId: chunk.id,
    label: `[${index + 1}] ${chunk.fileName}`,
    excerpt: chunk.content.slice(0, 320),
  }));
}
