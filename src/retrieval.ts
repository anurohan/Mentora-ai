import { createHash } from "node:crypto";
import type { SourceSegment } from "./extraction.js";

export type VectorIndexEntry = { chunkId: string; vector: number[] };
export type RetrievalResult = { segment: SourceSegment; score: number };
const DIMENSIONS = 64;
const tokenize = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
const embed = (value: string) => {
  const vector = Array.from({ length: DIMENSIONS }, () => 0); for (const token of tokenize(value)) { const digest = createHash("sha256").update(token).digest(); const index = digest.readUInt32BE(0) % DIMENSIONS; vector[index] += digest[4] % 2 ? 1 : -1; } const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1; return vector.map((value) => value / norm);
};
const cosine = (left: number[], right: number[]) => left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
const overlap = (query: string, source: string) => { const q = new Set(tokenize(query)); const s = new Set(tokenize(source)); return q.size ? [...q].filter((token) => s.has(token)).length / q.size : 0; };
export const createVectorIndex = (segments: SourceSegment[]): VectorIndexEntry[] => segments.map((segment) => ({ chunkId: segment.chunkId, vector: embed(segment.sourceText) }));
export const retrieve = (segments: SourceSegment[], index: VectorIndexEntry[] | undefined, query: string, limit = 5): RetrievalResult[] => {
  const queryVector = embed(query); const indexed = index ?? createVectorIndex(segments); const byId = new Map(segments.map((segment) => [segment.chunkId, segment]));
  return indexed.map((entry) => { const segment = byId.get(entry.chunkId); return segment ? { segment, score: cosine(queryVector, entry.vector) * 0.8 + overlap(query, segment.sourceText) * 0.2 } : null; }).filter((item): item is RetrievalResult => item !== null).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(limit, 20)));
};
