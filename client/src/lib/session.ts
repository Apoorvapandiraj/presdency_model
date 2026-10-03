import type {
  ApiSuccess,
  AskResponseData,
  ChatTurn,
  StudentProfile,
} from '../types';

const SESSION_KEY = 'puarai.session-id';
const PROFILE_KEY = 'puarai.student-profile';
const HISTORY_KEY = 'puarai.chat-history';
const MAX_TURNS = 10;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private-mode storage — session stays in-memory for this page load.
  }
}

/** Stable per-browser session id (crypto.randomUUID with a fallback). */
export function getSessionId(): string {
  const existing = readJson<string>(SESSION_KEY);
  if (typeof existing === 'string' && SESSION_ID_PATTERN.test(existing)) {
    return existing;
  }
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  writeJson(SESSION_KEY, id);
  return id;
}

export function loadProfile(): StudentProfile {
  return readJson<StudentProfile>(PROFILE_KEY) ?? {};
}

/** Merges non-empty fields over the persisted profile and saves. */
export function saveProfile(incoming: StudentProfile): StudentProfile {
  const merged: StudentProfile = { ...loadProfile() };
  if (incoming.name) merged.name = incoming.name;
  if (incoming.program) merged.program = incoming.program;
  if (incoming.semester) merged.semester = incoming.semester;
  writeJson(PROFILE_KEY, merged);
  return merged;
}

export function loadHistory(): ChatTurn[] {
  const raw = readJson<ChatTurn[]>(HISTORY_KEY);
  return Array.isArray(raw) ? raw.slice(-MAX_TURNS) : [];
}

export function appendHistory(
  userText: string,
  assistantText: string,
): ChatTurn[] {
  const turns: ChatTurn[] = [
    ...loadHistory(),
    { role: 'user' as const, text: userText },
    { role: 'assistant' as const, text: assistantText },
  ];
  const history = turns.slice(-MAX_TURNS);
  writeJson(HISTORY_KEY, history);
  return history;
}

/** Clears session id, profile and history (fresh onboarding). */
export function resetSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export type { ApiSuccess, AskResponseData };
