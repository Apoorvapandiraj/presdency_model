import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  VOICE_LANGS,
  translations,
  type TranslationKey,
} from '../i18n/translations';
import type { Lang } from '../types';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Trilingual lookup with English fallback for missing keys. */
  t: (key: TranslationKey) => string;
  /** BCP-47 locale for the Web Speech API (en-IN / hi-IN / kn-IN). */
  voiceLang: string;
}

const STORAGE_KEY = 'puarai.language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'kn') return saved;
  } catch {
    // Storage can be blocked (private mode) — fall through to English.
  }
  return 'en';
}

function lookup(tree: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object') {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, tree);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore quota / privacy errors — language still works in-memory.
    }
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey): string => {
      const current = lookup(translations[lang], key);
      if (typeof current === 'string' && current.length > 0) return current;
      const fallback = lookup(translations.en, key);
      return typeof fallback === 'string' ? fallback : String(key);
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t, voiceLang: VOICE_LANGS[lang] }),
    [lang, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside <LanguageProvider>');
  }
  return ctx;
}
