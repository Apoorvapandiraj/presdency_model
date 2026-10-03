/**
 * Hybrid retrieval.
 *
 * Primary  : MongoDB Atlas Vector Search ($vectorSearch over 768-dim Gemini
 *            embeddings, seeded by `npm run seed`).
 * Fallback : in-memory TF-IDF + cosine similarity over the local corpus —
 *            zero external dependencies, used whenever MONGODB_URI is unset,
 *            the Atlas index is missing, embeddings fail, or the cluster is
 *            unreachable (with fast-fail after repeated errors).
 */

import type { RegulationChunk } from './corpus.js';
import { REGULATION_CORPUS } from './corpus.js';
import type { RetrievalHit, RetrievalOutcome } from './types.js';
import { embedText } from './geminiClient.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'and', 'or', 'is', 'are',
  'was', 'were', 'be', 'been', 'it', 'this', 'that', 'with', 'as', 'at', 'by',
  'from', 'if', 'we', 'you', 'i', 'my', 'me', 'can', 'do', 'does', 'did',
  'have', 'has', 'had', 'not', 'no', 'so', 'what', 'which', 'who', 'how',
  'when', 'will', 'would', 'should', 'shall', 'may', 'all', 'any', 'our',
  'their', 'there', 'here', 'than', 'then', 'too', 'very', 'am', 'isnt',
]);

/** Lower-cases, strips punctuation, drops stop-words, light singular fold. */
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

interface DocVector {
  chunk: RegulationChunk;
  weights: Map<string, number>;
  norm: number;
}
class LocalTfidfIndex {
  private docs: DocVector[] = [];
  private df = new Map<string, number>();
  private built = false;

  build(): void {
    if (this.built) return;
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
      const seen = new Set(tokens);
      for (const term of seen) this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }

    const n = REGULATION_CORPUS.length;
    tokenLists.forEach((tokens, i) => {
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      const weights = new Map<string, number>();
      let sumSq = 0;
      for (const [term, count] of tf) {
        const idf = Math.log(1 + n / (this.df.get(term) ?? 1));
        const w = (1 + Math.log(count)) * idf;
        weights.set(term, w);
        sumSq += w * w;
      }
      this.docs.push({
        chunk: REGULATION_CORPUS[i],
        weights,
        norm: Math.sqrt(sumSq) || 1,
      });
    });

    this.built = true;
  }

  search(query: string, topK: number): RetrievalHit[] {
    this.build();
    const tf = new Map<string, number>();
    for (const t of tokenize(query)) tf.set(t, (tf.get(t) ?? 0) + 1);

    const n = this.docs.length || 1;
    const qWeights = new Map<string, number>();
    let qSumSq = 0;
    for (const [term, count] of tf) {
      const idf = Math.log(1 + n / (this.df.get(term) ?? 1));
      const w = (1 + Math.log(count)) * idf;
      qWeights.set(term, w);
      qSumSq += w * w;
    }
    const qNorm = Math.sqrt(qSumSq) || 1;

    const hits: RetrievalHit[] = [];
    for (const doc of this.docs) {
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
}

const localIndex = new LocalTfidfIndex();

/** Synchronous local TF-IDF + cosine search over the regulation corpus. */
export function localSearch(query: string, topK = 4): RetrievalHit[] {
  return localIndex.search(query, topK);
}
/* ── MongoDB Atlas Vector Search ──────────────────────────────────────────── */

const ATLAS_TIMEOUT_MS = 6_000;
let mongoFailures = 0;
let mongoDisabled = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + ' timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

async function mongoVectorSearch(
  query: string,
  topK: number,
): Promise<RetrievalHit[] | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || mongoDisabled) return null;

  try {
    const vector = await embedText(query);
    if (!vector) return null;

    const { default: mongoose } = await import('mongoose');
    if (mongoose.connection.readyState !== 1) {
      await withTimeout(
        mongoose.connect(uri, {
          serverSelectionTimeoutMS: ATLAS_TIMEOUT_MS,
          connectTimeoutMS: ATLAS_TIMEOUT_MS,
        }),
        ATLAS_TIMEOUT_MS,
        'mongoose.connect',
      );
    }

    const db = mongoose.connection.db;
    if (!db) return null;

    const collectionName =
      process.env.MONGODB_COLLECTION || 'puarai_regulations';
    const indexName = process.env.MONGODB_VECTOR_INDEX || 'puarai_vector_index';
    const collection = db.collection(collectionName);

    const rows = (await withTimeout(
      collection
        .aggregate([
          {
            $vectorSearch: {
              index: indexName,
              path: 'embedding',
              queryVector: vector,
              numCandidates: topK * 25,
              limit: topK,
            },
          },
          { $project: { chunkId: 1, score: { $meta: 'vectorSearchScore' } } },
        ])
        .toArray(),
      ATLAS_TIMEOUT_MS,
      '$vectorSearch',
    )) as Array<{ chunkId?: string; score?: number }>;

    const byId = new Map(REGULATION_CORPUS.map((c) => [c.id, c]));
    const hits: RetrievalHit[] = [];
    for (const row of rows) {
      const chunk = row.chunkId ? byId.get(row.chunkId) : undefined;
      if (chunk) hits.push({ chunk, score: row.score ?? 0.5 });
    }
    return hits.length > 0 ? hits : null;
  } catch (error) {
    mongoFailures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      '[vectorStore] Atlas search failed (' + mongoFailures + '): ' + message,
    );
    if (mongoFailures >= 3) {
      mongoDisabled = true;
      console.warn('[vectorStore] Atlas unavailable — using local TF-IDF.');
    }
    return null;
  }
}

/**
 * Hybrid retrieval entry point: tries Atlas Vector Search first (when
 * configured), then falls back to the local TF-IDF + cosine index.
 */
export async function retrieve(
  query: string,
  topK = 4,
): Promise<RetrievalOutcome> {
  const atlasHits = await mongoVectorSearch(query, topK);
  if (atlasHits && atlasHits.length > 0) {
    return { hits: atlasHits, source: 'mongodb-atlas' };
  }
  return { hits: localSearch(query, topK), source: 'local-tfidf' };
}

/** Diagnostics for /api/health. */
export function vectorStoreStatus(): {
  mongodbConfigured: boolean;
  mongoFailures: number;
  mongoDisabled: boolean;
} {
  return {
    mongodbConfigured: Boolean(process.env.MONGODB_URI?.trim()),
    mongoFailures,
    mongoDisabled,
  };
}


