export async function extractTextFromDocument(input: {
  bytes: Uint8Array;
  contentType?: string | null;
  fileName?: string | null;
}) {
  const contentType = input.contentType?.toLowerCase() ?? "";
  const fileName = input.fileName?.toLowerCase() ?? "";

  if (isTextLike(contentType, fileName)) {
    return new TextDecoder().decode(input.bytes);
  }

  if (contentType.includes("pdf") || fileName.endsWith(".pdf")) {
    return extractPdfText(input.bytes);
  }

  if (
    contentType.includes("wordprocessingml.document") ||
    contentType.includes("msword") ||
    fileName.endsWith(".docx")
  ) {
    return extractDocxText(input.bytes);
  }

  throw new Error(`Unsupported document content type for text extraction: ${input.contentType ?? input.fileName ?? "unknown"}`);
}

function isTextLike(contentType: string, fileName: string) {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("csv") ||
    contentType.includes("xml") ||
    [".md", ".markdown", ".txt", ".json", ".csv", ".tsv", ".xml"].some((extension) => fileName.endsWith(extension))
  );
}

async function extractPdfText(bytes: Uint8Array) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(bytes) });
  try {
    const parsed = await parser.getText();
    return parsed.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(bytes: Uint8Array) {
  const module = await import("mammoth");
  const mammoth = module.default ?? module;
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value?.trim() ?? "";
}
