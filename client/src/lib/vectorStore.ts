/**
 * Client-side in-memory vector store — TF-IDF + cosine similarity over the
 * regulation corpus. This is the local RAG fallback required by the spec:
 * when the backend is unreachable, `localRag.ts` answers from this index in
 * the browser with zero network dependency.
 *
 * The algorithm intentionally mirrors server/vectorStore.ts.
 */

import {
  REGULATION_CORPUS,
  type RegulationChunk,
} from '../../../server/corpus';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'and', 'or', 'is', 'are',
  'was', 'were', 'be', 'been', 'it', 'this', 'that', 'with', 'as', 'at', 'by',
  'from', 'if', 'we', 'you', 'i', 'my', 'me', 'can', 'do', 'does', 'did',
  'have', 'has', 'had', 'not', 'no', 'so', 'what', 'which', 'who', 'how',
  'when', 'will', 'would', 'should', 'shall', 'may', 'all', 'any', 'our',
  'their', 'there', 'here', 'than', 'then', 'too', 'very', 'am',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .map((t) =>
      t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t,
    );
}

export interface ScoredChunk {
  chunk: RegulationChunk;
  score: number;
}

interface DocVector {
  chunk: RegulationChunk;
  weights: Map<string, number>;
  norm: number;
}

let docs: DocVector[] | null = null;
let df: Map<string, number> | null = null;

function buildIndex(): void {
  if (docs && df) return;
  df = new Map();
  const tokenLists: string[][] = [];

  for (const chunk of REGULATION_CORPUS) {
    const text = [
      chunk.clauseId,
      chunk.sectionTitle,
      chunk.summary,
      chunk.snippet,
      chunk.keywords.join(' '),
      chunk.topic,
    ].join(' ');
    const tokens = tokenize(text);
    tokenLists.push(tokens);
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const n = REGULATION_CORPUS.length;
  docs = tokenLists.map((tokens, i) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    const weights = new Map<string, number>();
    let sumSq = 0;
    for (const [term, count] of tf) {
      const idf = Math.log(1 + n / (df!.get(term) ?? 1));
      const w = (1 + Math.log(count)) * idf;
      weights.set(term, w);
      sumSq += w * w;
    }
    return {
      chunk: REGULATION_CORPUS[i],
      weights,
      norm: Math.sqrt(sumSq) || 1,
    };
  });
}

/** Ranked cosine-similarity search (0..1] over the local corpus. */
export function searchCorpus(query: string, topK = 3): ScoredChunk[] {
  buildIndex();
  const tf = new Map<string, number>();
  for (const t of tokenize(query)) tf.set(t, (tf.get(t) ?? 0) + 1);

  const n = docs!.length || 1;
  const qWeights = new Map<string, number>();
  let qSumSq = 0;
  for (const [term, count] of tf) {
    const idf = Math.log(1 + n / (df!.get(term) ?? 1));
    const w = (1 + Math.log(count)) * idf;
    qWeights.set(term, w);
    qSumSq += w * w;
  }
  const qNorm = Math.sqrt(qSumSq) || 1;

  const hits: ScoredChunk[] = [];
  for (const doc of docs!) {
    let dot = 0;
    for (const [term, qw] of qWeights) {
      const dw = doc.weights.get(term);
      if (dw !== undefined) dot += qw * dw;
    }
    const score = dot / (qNorm * doc.norm);
    if (score > 0) hits.push({ chunk: doc.chunk, score });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

/** Number of grounded chunks available offline. */
export function offlineCorpusSize(): number {
  return REGULATION_CORPUS.length;
}
