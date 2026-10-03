/**
 * Shared backend types for PUARAI.
 * Kept inside `server/` (the tsc rootDir) so the compiled entry lands at
 * `dist/server.js` exactly as required by `npm start`.
 */

import type { RegulationChunk, RegulationTopic } from './corpus.js';

/** Supported UI + answer languages: English, Hindi, Kannada. */
export type Lang = 'en' | 'hi' | 'kn';

/** Intent categories produced by Stage-1 query analysis. */
export type IntentCategory =
  | 'attendance'
  | 'promotion'
  | 'grade-review'
  | 'makeup'
  | 'cgpa'
  | 'grading'
  | 'duration'
  | 'general'
  | 'greeting'
  | 'onboarding'
  | 'off-scope'
  | 'schedule';

/* ── Phase 2 — session state & student profiling ──────────────────────────── */

export interface StudentProfile {
  name?: string;
  program?: string; // e.g., "B.Tech CSE"
  semester?: string; // e.g., "5th Semester"
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AskRequest {
  query: string;
  sessionId?: string;
  profile?: StudentProfile;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  /** UI language (en | hi | kn) — kept for backward compatibility. */
  language?: Lang;
}

/* ── Stage 1 output ───────────────────────────────────────────────────────── */

/** Stage 1 output — normalized intent + terminology before retrieval. */
export interface AnalyzedQuery {
  /** Raw student query, trimmed. */
  original: string;
  /** Lower-cased, punctuation-normalised query. */
  normalized: string;
  /** Slang-normalised query used for vector / TF-IDF retrieval. */
  expandedQuery: string;
  intent: IntentCategory;
  /** Canonical administrative terms the slang was mapped to. */
  canonicalTerms: string[];
  /** Clause hint suggested by the terminology map (e.g. "Clause 14.1"). */
  suggestedClauseId?: string;
  language: Lang;
  /** True when the query mentions academic-regulation vocabulary at all. */
  hasAcademicTerms: boolean;
  /** True when the query is clearly outside academic-regulation scope. */
  offScope: boolean;
  /** True for greetings / small-talk that should not run retrieval. */
  greeting: boolean;
}

/** Citation metadata attached to every grounded response. */
export interface Citation {
  clauseId: string;
  sectionTitle: string;
  page: number;
  document: string;
  snippet: string;
  topic: RegulationTopic;
  /** Retrieval similarity score (0..1]. */
  score: number;
}

export type AskKind = 'answer' | 'refusal' | 'greeting' | 'onboarding';
export type EngineName = 'gemini' | 'local-fallback' | 'guard';

/** Successful /api/ask payload (also used for refusal + greeting kinds). */
export interface AskResult {
  kind: AskKind;
  /** 1–3 sentence direct answer, plain language (never verbatim PDF text). */
  directAnswer: string;
  /** Short empathetic explanation of the underlying rule logic. */
  explanation: string;
  citations: Citation[];
  intent: {
    category: IntentCategory;
    canonicalTerms: string[];
    suggestedClauseId?: string;
  };
  engine: EngineName;
  language: Lang;
  latencyMs: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
  retryAfter?: number;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type AskEnvelope = ApiSuccess<AskResult>;

/** /api/ask response payload — AskResult plus session-state echo. */
export interface AskResponseData extends AskResult {
  sessionId?: string;
  profile?: StudentProfile;
}

/** Shape of a regulation chunk as stored in MongoDB Atlas (seed script). */
export interface StoredChunk extends RegulationChunk {
  embedding?: number[];
}

/** TF-IDF cosine hit shape used by composeLocalAnswer. */
export interface ScoredChunk {
  chunk: RegulationChunk;
  score: number;
}

export interface RetrievalHit {
  chunk: RegulationChunk;
  score: number;
}

export interface RetrievalOutcome {
  hits: RetrievalHit[] | ScoredChunk[];
  source: 'mongodb-atlas' | 'local-tfidf';
}

export type { RegulationChunk, RegulationTopic };
