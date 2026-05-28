export interface TextChunk {
  content: string;
  index: number;
  tokenEstimate: number;
}

export function chunkText(input: string, maxChars = 1800, overlapChars = 220): TextChunk[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + maxChars, normalized.length);
    const softEnd = findSoftBreak(normalized, start, hardEnd);
    const content = normalized.slice(start, softEnd).trim();

    if (content) {
      chunks.push({
        content,
        index: chunks.length,
        tokenEstimate: Math.ceil(content.length / 4),
      });
    }

    if (softEnd >= normalized.length) break;
    start = Math.max(0, softEnd - overlapChars);
  }

  return chunks;
}

function findSoftBreak(text: string, start: number, hardEnd: number) {
  const window = text.slice(start, hardEnd);
  const paragraphBreak = window.lastIndexOf("\n\n");
  if (paragraphBreak > maxSoftBreakOffset(window.length)) return start + paragraphBreak;

  const sentenceBreak = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
  if (sentenceBreak > maxSoftBreakOffset(window.length)) return start + sentenceBreak + 1;

  return hardEnd;
}

function maxSoftBreakOffset(length: number) {
  return Math.floor(length * 0.6);
}
