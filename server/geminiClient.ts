/**
 * Google Gemini (`@google/genai`) wrapper — Gemini 2.5 Flash at
 * `temperature: 0.0` for strict, zero-hallucination factual grounding,
 * plus embeddings for MongoDB Atlas Vector Search.
 *
 * Every function degrades to `null` on missing key / network failure /
 * rate limiting — `ragEngine.ts` then switches to the local RAG fallback.
 */

import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const DEFAULT_EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

const LLM_TIMEOUT_MS = 15_000;
const EMBED_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 2;

let client: GoogleGenAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) return null;
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });
  }
  return client;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GroundedDraft {
  directAnswer: string;
  explanation: string;
}

function extractJson(text: string): unknown {
  const withoutFences = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFences.slice(start, end + 1));
    }
    throw new Error('LLM response was not valid JSON');
  }
}
export interface GroundedGenerationParams {
  question: string;
  language: 'en' | 'hi' | 'kn';
  /** Pre-formatted context block built by ragEngine. */
  contextBlock: string;
}

/**
 * Runs the constrained completion (temperature 0.0, JSON mode). Returns
 * `null` whenever the API is unavailable (no key, quota, network) so callers
 * can fall back to the local RAG path.
 */
export async function generateGroundedAnswer(
  params: GroundedGenerationParams,
): Promise<GroundedDraft | null> {
  const ai = getClient();
  if (!ai) return null;

  const languageName =
    params.language === 'hi'
      ? 'Hindi'
      : params.language === 'kn'
        ? 'Kannada'
        : 'English';

  const systemInstruction = [
    'You are PUARAI, the academic-regulations assistant of Presidency University.',
    'Answer ONLY from the numbered CONTEXT excerpts of the official regulations.',
    'Rules, all mandatory:',
    '1. Reply in ' + languageName + '.',
    '2. First sentence(s) must be a DIRECT ANSWER of 1-3 plain, human-like sentences.',
    '3. Then at most 2-3 sentences explaining the underlying rule logic empathetically.',
    '4. NEVER quote or reproduce verbatim passages from the CONTEXT; explain the logic instead.',
    '5. NEVER invent clauses, dates, percentages or deadlines that are absent from CONTEXT.',
    '6. If CONTEXT does not contain the answer, set refusal=true and write a one-sentence refusal.',
    '7. Output STRICT JSON only: {"directAnswer": string, "explanation": string, "refusal": boolean}.',
    '8. When STUDENT CONTEXT gives a name, address the student by name naturally once.',
  ].join('\n');

  const contents =
    'CONTEXT:\n' + params.contextBlock + '\n\nSTUDENT QUESTION: ' + params.question;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents,
          config: {
            systemInstruction,
            temperature: 0.0,
            topP: 0.1,
            maxOutputTokens: 700,
            responseMimeType: 'application/json',
          },
        }),
        LLM_TIMEOUT_MS,
        'gemini.generateContent',
      );

      const text = response.text;
      if (!text) return null;

      const parsed = extractJson(text) as {
        directAnswer?: unknown;
        explanation?: unknown;
        refusal?: unknown;
      };

      if (parsed.refusal === true) return null; // ungrounded -> local path

      const directAnswer = String(parsed.directAnswer ?? '').trim();
      const explanation = String(parsed.explanation ?? '').trim();
      if (!directAnswer) return null;
      return { directAnswer, explanation };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Quota / auth failures will not heal on retry - fail fast to fallback.
      if (/API key not valid|401|403|quota|RESOURCE_EXHAUSTED/i.test(message)) {
        console.warn('[gemini] non-retryable failure: ' + message);
        return null;
      }
      if (attempt === MAX_ATTEMPTS) {
        console.warn(
          '[gemini] generation failed after ' + MAX_ATTEMPTS + ' attempts: ' + message,
        );
        return null;
      }
      await sleep(300 * attempt);
    }
  }
  return null;
}

/**
 * Embeds text with the Gemini embedding model (768 dims) for Atlas Vector
 * Search. Returns `null` when unavailable so callers fall back to TF-IDF.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = (await withTimeout(
      ai.models.embedContent({
        model: DEFAULT_EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
      EMBED_TIMEOUT_MS,
      'gemini.embedContent',
    )) as {
      embeddings?: Array<{ values?: number[] }>;
      embedding?: { values?: number[] };
    };

    const values = response.embeddings?.[0]?.values ?? response.embedding?.values;
    if (!values || values.length === 0) return null;
    return values;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[gemini] embedText failed: ' + message);
    return null;
  }
}

