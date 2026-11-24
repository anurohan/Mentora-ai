import { PDFParse } from "pdf-parse";
import AdmZip from "adm-zip";

export type DocumentType = "txt" | "md" | "pdf" | "docx" | "pptx";
export type ExtractionProgress = { phase: "validated" | "extracting" | "complete"; completed: number; total: number };
export type SourceSegment = {
  documentId: string;
  originalFilename: string;
  documentType: DocumentType;
  pageNumber?: number;
  slideNumber?: number;
  section?: string;
  paragraphId?: string;
  chunkId: string;
  sourceText: string;
  extractedAt: string;
};
export class DocumentExtractionError extends Error {
  readonly code: "UNSUPPORTED_TYPE" | "TOO_LARGE" | "EMPTY" | "MALFORMED" | "ENCRYPTED" | "EXTRACTION_FAILED";
  constructor(message: string, code: "UNSUPPORTED_TYPE" | "TOO_LARGE" | "EMPTY" | "MALFORMED" | "ENCRYPTED" | "EXTRACTION_FAILED") { super(message); this.name = "DocumentExtractionError"; this.code = code; }
}
export type ExtractionInput = { documentId: string; originalFilename: string; mimeType: string; buffer: Buffer; onProgress?: (progress: ExtractionProgress) => void };

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const now = () => new Date().toISOString();
const progress = (input: ExtractionInput, value: ExtractionProgress) => input.onProgress?.(value);
const decodeXml = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const xmlText = (value: string) => decodeXml([...value.matchAll(/<(?:w:t|a:t)(?:\s[^>]*)?>([\s\S]*?)<\/(?:w:t|a:t)>/g)].map((match) => match[1]).join(" ").replace(/\s+/g, " ").trim());
const segment = (input: ExtractionInput, sourceText: string, location: Partial<SourceSegment>, index: number): SourceSegment | null => {
  const text = sourceText.replace(/\s+/g, " ").trim(); if (!text) return null;
  return { documentId: input.documentId, originalFilename: input.originalFilename, documentType: typeFor(input.mimeType, input.originalFilename), chunkId: `${input.documentId}:chunk-${index + 1}`, sourceText: text, extractedAt: now(), ...location };
};
const typeFor = (mimeType: string, filename: string): DocumentType => {
  const lower = filename.toLowerCase(); if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mimeType.includes("wordprocessingml") || lower.endsWith(".docx")) return "docx";
  if (mimeType.includes("presentationml") || lower.endsWith(".pptx")) return "pptx";
  if (mimeType === "text/markdown" || lower.endsWith(".md")) return "md";
  if (mimeType === "text/plain" || lower.endsWith(".txt")) return "txt";
  throw new DocumentExtractionError("Unsupported document type.", "UNSUPPORTED_TYPE");
};
const validateArchive = (buffer: Buffer) => {
  if (buffer.subarray(0, 2).toString("ascii") !== "PK") throw new DocumentExtractionError("Document is not a valid ZIP package.", "MALFORMED");
  try {
    const zip = new AdmZip(buffer); const entries = zip.getEntries();
    if (!entries.length || entries.some((entry) => entry.entryName.split(/[\\/]/).includes("..") || entry.header.encrypted)) throw new DocumentExtractionError("Encrypted or unsafe document package.", "ENCRYPTED");
    if (!zip.test()) throw new DocumentExtractionError("Document package failed integrity validation.", "MALFORMED");
    return zip;
  } catch (error) { if (error instanceof DocumentExtractionError) throw error; throw new DocumentExtractionError("Document package is malformed or corrupted.", "MALFORMED"); }
};
const readZipXml = (zip: AdmZip, name: string) => { const value = zip.readAsText(name); if (!value) throw new DocumentExtractionError(`Required document part is missing: ${name}`, "MALFORMED"); return value; };

const extractText = (input: ExtractionInput, type: "txt" | "md") => {
  const text = input.buffer.toString("utf8"); const lines = text.split(/\r?\n/); const result = lines.map((line, index) => { const clean = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, ""); return segment(input, clean, { section: type === "md" && /^#{1,6}\s/.test(line) ? line.replace(/^#+\s*/, "") : undefined, paragraphId: `paragraph-${index + 1}` }, index); }).filter((item): item is SourceSegment => Boolean(item));
  if (!result.length) throw new DocumentExtractionError("Document contains no readable text.", "EMPTY"); return result;
};

const extractPdf = async (input: ExtractionInput) => {
  if (input.buffer.subarray(0, 4).toString("ascii") !== "%PDF") throw new DocumentExtractionError("PDF signature is invalid.", "MALFORMED");
  progress(input, { phase: "extracting", completed: 0, total: 1 }); const parser = new PDFParse({ data: input.buffer });
  try { const result = await parser.getText(); const segments = result.pages.map((page, index) => segment(input, page.text, { pageNumber: page.num, paragraphId: `page-${page.num}` }, index)).filter((item): item is SourceSegment => Boolean(item)); if (!segments.length) throw new DocumentExtractionError("PDF contains no extractable text; OCR is not configured.", "EMPTY"); progress(input, { phase: "extracting", completed: result.total, total: result.total }); return segments; } catch (error) { if (error instanceof DocumentExtractionError) throw error; throw new DocumentExtractionError(`PDF extraction failed: ${error instanceof Error ? error.message : "unknown error"}`, "EXTRACTION_FAILED"); } finally { await parser.destroy(); }
};

const extractDocx = (input: ExtractionInput) => {
  const zip = validateArchive(input.buffer); const xml = readZipXml(zip, "word/document.xml"); const segments: SourceSegment[] = []; let index = 0;
  const blocks = [...xml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((match) => match[0]);
  for (const block of blocks) {
    if (block.startsWith("<w:tbl")) { for (const row of block.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)) { const cells = [...row[0].matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)].map((cell) => xmlText(cell[0])).filter(Boolean); const item = segment(input, cells.join(" | "), { section: "table", paragraphId: `table-row-${index + 1}` }, index++); if (item) segments.push(item); } continue; }
    const text = xmlText(block); const style = block.match(/<w:pStyle[^>]+w:val="([^"]+)"/i)?.[1]; const item = segment(input, text, { section: style?.startsWith("Heading") ? text : undefined, paragraphId: `paragraph-${index + 1}` }, index++); if (item) segments.push(item);
  }
  if (!segments.length) throw new DocumentExtractionError("DOCX contains no readable paragraphs or tables.", "EMPTY"); return segments;
};

const extractPptx = (input: ExtractionInput) => {
  const zip = validateArchive(input.buffer); const slides = zip.getEntries().filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName)).sort((a, b) => Number(a.entryName.match(/\d+/)?.[0]) - Number(b.entryName.match(/\d+/)?.[0])); if (!slides.length) throw new DocumentExtractionError("PPTX contains no slides.", "EMPTY");
  const segments: SourceSegment[] = []; slides.forEach((entry, index) => { const text = xmlText(entry.getData().toString("utf8")); const item = segment(input, text, { slideNumber: index + 1, paragraphId: `slide-${index + 1}` }, index); if (item) segments.push(item); }); if (!segments.length) throw new DocumentExtractionError("PPTX contains no readable slide text.", "EMPTY"); return segments;
};

export async function extractDocument(input: ExtractionInput): Promise<SourceSegment[]> {
  if (!Buffer.isBuffer(input.buffer) || input.buffer.length > MAX_DOCUMENT_BYTES) throw new DocumentExtractionError("Document exceeds the 10 MB extraction limit.", "TOO_LARGE");
  const type = typeFor(input.mimeType, input.originalFilename); progress(input, { phase: "validated", completed: 0, total: 1 });
  const result = type === "pdf" ? await extractPdf(input) : type === "docx" ? extractDocx(input) : type === "pptx" ? extractPptx(input) : extractText(input, type); progress(input, { phase: "complete", completed: result.length, total: result.length }); return result;
}

