/**
 * Seeds MongoDB Atlas Vector Search with 768-dim Gemini embeddings for every
 * regulation chunk. Run with:
 *
 *   cp .env.example .env   # fill GEMINI_API_KEY + MONGODB_URI
 *   npm run seed
 *
 * Expected Atlas Search index (JSON definition) on the collection:
 * {
 *   "name": "puarai_vector_index",
 *   "fields": [
 *     { "type": "vector", "path": "embedding",
 *       "numDimensions": 768, "similarity": "cosine" },
 *     { "type": "string", "path": "clauseId" }
 *   ]
 * }
 */

import { ENV_FILE } from '../env.js';
import mongoose from 'mongoose';
import { REGULATION_CORPUS, getCorpusStats } from '../corpus.js';
import { EMBEDDING_DIMENSIONS, embedText, isGeminiConfigured } from '../geminiClient.js';

function chunkText(chunk: (typeof REGULATION_CORPUS)[number]): string {
  return [
    chunk.clauseId,
    chunk.sectionTitle,
    chunk.summary,
    chunk.keywords.join(' '),
    chunk.snippet,
  ].join('\n');
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not set — configure .env before seeding.');
  }
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not set — embeddings require Gemini.');
  }

  const stats = getCorpusStats();
  console.log(`[seed] indexing ${stats.chunks} chunks into Atlas Vector Search…`);
  console.log(`[seed] env: ${ENV_FILE ?? 'process env'}`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection did not expose a db handle.');

  const collectionName =
    process.env.MONGODB_COLLECTION || 'puarai_regulations';
  const collection = db.collection(collectionName);

  await collection.createIndex({ chunkId: 1 }, { unique: true });

  let seeded = 0;
  for (const chunk of REGULATION_CORPUS) {
    const embedding = await embedText(chunkText(chunk));
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.warn(`[seed] skipping ${chunk.id}: embedding unavailable`);
      continue;
    }
    await collection.updateOne(
      { chunkId: chunk.id },
      {
        $set: {
          chunkId: chunk.id,
          clauseId: chunk.clauseId,
          sectionTitle: chunk.sectionTitle,
          topic: chunk.topic,
          page: chunk.page,
          document: chunk.document,
          snippet: chunk.snippet,
          summary: chunk.summary,
          keywords: chunk.keywords,
          embedding,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    seeded += 1;
    console.log(`[seed] ✓ ${chunk.clauseId} (${chunk.id})`);
  }

  console.log(`[seed] done — ${seeded}/${stats.chunks} chunks indexed.`);
  await mongoose.disconnect();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed] failed: ${message}`);
  process.exitCode = 1;
});
