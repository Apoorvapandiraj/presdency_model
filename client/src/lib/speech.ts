/**
 * Web Speech API helpers — SpeechRecognition (STT) + speechSynthesis (TTS)
 * with trilingual locales. All features degrade gracefully when unsupported.
 */

import { VOICE_LANGS } from '../i18n/translations';
import type { Lang } from '../types';

export interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | SpeechRecognitionCtor
    | undefined;
  return ctor ?? null;
}

export function voiceLocale(lang: Lang): string {
  return VOICE_LANGS[lang];
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeakOptions {
  lang: Lang;
  onEnd?: () => void;
  onError?: () => void;
}

/** Speaks the given text; cancels any utterance already in flight. */
export function speakText(text: string, options: SpeakOptions): boolean {
  if (!isSpeechSynthesisSupported() || text.trim().length === 0) return false;
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voiceLocale(options.lang);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onError?.();

  // Prefer a voice matching the requested locale when one is installed.
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang?.startsWith(options.lang));
  if (match) utterance.voice = match;

  window.speechSynthesis.speak(utterance);
  return true;
}
