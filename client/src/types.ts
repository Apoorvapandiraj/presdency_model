/**
 * Frontend types — mirrors the API contract produced by server/types.ts.
 */

export type Lang = 'en' | 'hi' | 'kn';

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

/** /api/ask request payload. */
export interface AskRequest {
  query: string;
  language?: Lang;
  sessionId?: string;
  profile?: StudentProfile;
  history?: ChatTurn[];
}

export interface Citation {
  clauseId: string;
  sectionTitle: string;
  page: number;
  document: string;
  snippet: string;
  topic: string;
  score: number;
}

export type AskKind = 'answer' | 'refusal' | 'greeting' | 'onboarding';
export type EngineName = 'gemini' | 'local-fallback' | 'guard';

export interface AskResult {
  kind: AskKind;
  /** 1–3 sentence direct answer, plain language. */
  directAnswer: string;
  /** Empathetic explanation of the underlying rule logic. */
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** User query text or assistant direct answer. */
  text: string;
  explanation?: string;
  citations?: Citation[];
  kind?: AskKind;
  engine?: EngineName;
  intentCategory?: IntentCategory;
  language?: Lang;
  /** True when the assistant message failed (rendered as an error bubble). */
  isError?: boolean;
  errorMessage?: string;
  retryAfterSeconds?: number;
  createdAt: number;
}
