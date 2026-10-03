/**
 * Phase 2 — Session / Profile state engine.
 *
 * In-memory session store keyed by sessionId (30-minute TTL, bounded size)
 * plus the request-payload sanitizers and the free-text profile extractor
 * ("I'm Aarav, 3rd Year B.Tech" → { name, program }).
 *
 * Persistence is intentionally in-memory for the single Node instance;
 * swap the Map for Redis/Mongo when scaling horizontally.
 */

import type { AskRequest, ChatTurn, StudentProfile } from './types.js';

const SESSION_TTL_MS = 30 * 60_000;
const MAX_SESSIONS = 5_000;
const MAX_HISTORY_TURNS = 10;

interface SessionState {
  sessionId: string;
  profile: StudentProfile;
  history: ChatTurn[];
  updatedAt: number;
}

const sessions = new Map<string, SessionState>();

function sweep(now: number): void {
  for (const [id, state] of sessions) {
    if (now - state.updatedAt > SESSION_TTL_MS) sessions.delete(id);
  }
  // Hard cap: drop oldest entries first (Map preserves insertion order).
  while (sessions.size > MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) break;
    sessions.delete(oldest);
  }
}

/** Accepts client-generated ids: crypto.randomUUID() style, 8–64 chars. */
export function sanitizeSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  return id;
}

export function sanitizeProfile(raw: unknown): StudentProfile {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  const pick = (key: string, max: number): string | undefined => {
    const value = input[key];
    if (typeof value !== 'string') return undefined;
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, max);
    return clean.length > 0 ? clean : undefined;
  };
  const profile: StudentProfile = {};
  const name = pick('name', 40);
  const program = pick('program', 60);
  const semester = pick('semester', 40);
  if (name) profile.name = name;
  if (program) profile.program = program;
  if (semester) profile.semester = semester;
  return profile;
}

export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== 'object') continue;
    const turn = item as Record<string, unknown>;
    if (turn.role !== 'user' && turn.role !== 'assistant') continue;
    if (typeof turn.text !== 'string') continue;
    const text = turn.text.replace(/\s+/g, ' ').trim().slice(0, 600);
    if (text.length > 0) turns.push({ role: turn.role, text });
  }
  return turns;
}

/** Non-empty incoming fields override stored fields. */
export function mergeProfile(
  base: StudentProfile,
  incoming: StudentProfile,
): StudentProfile {
  const merged: StudentProfile = { ...base };
  if (incoming.name) merged.name = incoming.name;
  if (incoming.program) merged.program = incoming.program;
  if (incoming.semester) merged.semester = incoming.semester;
  return merged;
}

/** Delta fields only fill gaps — extraction never overwrites known values. */
export function fillProfile(
  base: StudentProfile,
  delta: StudentProfile,
): StudentProfile {
  const filled: StudentProfile = { ...base };
  if (!filled.name && delta.name) filled.name = delta.name;
  if (!filled.program && delta.program) filled.program = delta.program;
  if (!filled.semester && delta.semester) filled.semester = delta.semester;
  return filled;
}

export function isProfileComplete(profile?: StudentProfile): boolean {
  return Boolean(profile?.name && profile?.program && profile?.semester);
}

export function describeProfile(profile?: StudentProfile): string {
  if (!profile) return '';
  const parts = [
    profile.name && `name: ${profile.name}`,
    profile.program && `program: ${profile.program}`,
    profile.semester && `semester: ${profile.semester}`,
  ].filter(Boolean);
  return parts.join(', ');
}
/** Loads (or creates) a session; incoming non-empty fields override stored. */
export function touchSession(
  sessionId: string,
  incoming: StudentProfile,
): StudentProfile {
  const now = Date.now();
  sweep(now);
  let state = sessions.get(sessionId);
  if (!state) {
    state = { sessionId, profile: {}, history: [], updatedAt: now };
    sessions.set(sessionId, state);
  }
  state.profile = mergeProfile(state.profile, incoming);
  state.updatedAt = now;
  return { ...state.profile };
}

export function saveSessionProfile(
  sessionId: string,
  profile: StudentProfile,
): void {
  const state = sessions.get(sessionId);
  if (state) {
    state.profile = { ...profile };
    state.updatedAt = Date.now();
  }
}

export function appendTurns(sessionId: string, turns: ChatTurn[]): void {
  const state = sessions.get(sessionId);
  if (!state) return;
  state.history = [...state.history, ...turns].slice(-MAX_HISTORY_TURNS);
  state.updatedAt = Date.now();
}

export function getSessionHistory(sessionId: string): ChatTurn[] {
  return sessions.get(sessionId)?.history ?? [];
}

/* ── Free-text profile extraction ─────────────────────────────────────────── */

/** Words that follow "I am/I'm" but are never names. */
const NAME_BLOCKLIST = new Set([
  'a', 'an', 'the', 'here', 'really', 'so', 'not', 'sorry', 'scared',
  'stressed', 'worried', 'trying', 'going', 'just', 'very', 'sure', 'now',
  'fine', 'also', 'still', 'already', 'done', 'ok', 'okay', 'good', 'bad',
  'thinking', 'asking', 'looking', 'doing', 'feeling', 'confused', 'sad',
  'happy', 'afraid', 'nervous', 'excited', 'certain', 'first', 'back',
]);

/**
 * Extracts profile fields from free text:
 *   "I'm Aarav, 3rd Year B.Tech. …"  → { name: "Aarav", program: "3rd Year B.Tech" }
 *   "my name is Priya, 5th semester"  → { name: "Priya", semester: "5th Semester" }
 * Never overwrites — callers use fillProfile() for gap-only merges.
 */
export function extractProfileDelta(query: string): StudentProfile {
  const delta: StudentProfile = {};

  const nameMatch = query.match(
    /\b(?:i am|i'm|im|my name is|name is|call me)\s+([A-Za-z][A-Za-z'\-]{1,24})/i,
  );
  if (nameMatch) {
    const candidate = nameMatch[1].replace(/['\-]+$/g, '');
    if (candidate && !NAME_BLOCKLIST.has(candidate.toLowerCase())) {
      delta.name = candidate;
    }
  }

  // Program: "3rd Year B.Tech" (degree token must follow the year directly —
  // avoids capturing "3rd Year B" from "3rd Year B.Tech.").
  const yearMatch = query.match(
    /\b(\d{1,2}(?:st|nd|rd|th)\s+year\s+(?:B\.Tech|B\.E|M\.Tech|MBA|BBA|BCA|MCA|B\.Sc|M\.Sc|LL\.B)(?:\s+(?:CSE|ECE|EEE|MECH|CIVIL|IT|AIML|ISE))?)/i,
  );
  if (yearMatch) {
    delta.program = yearMatch[1].replace(/\s+/g, ' ').trim();
  } else {
    const degreeMatch = query.match(
      /\b((?:B\.Tech|B\.E|M\.Tech|MBA|BBA|BCA|MCA|B\.Sc|M\.Sc|LL\.B)(?:\s+(?:CSE|ECE|EEE|MECH|CIVIL|IT|AIML|ISE))?)\b/i,
    );
    if (degreeMatch) {
      delta.program = degreeMatch[1].replace(/\s+/g, ' ').trim();
    }
  }

  const semesterMatch = query.match(/\b(\d{1,2}(?:st|nd|rd|th)\s+semester)\b/i);
  if (semesterMatch) {
    delta.semester = semesterMatch[1].replace(/\s+/g, ' ').trim();
  }

  return delta;
}

