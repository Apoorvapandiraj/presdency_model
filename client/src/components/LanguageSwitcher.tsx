import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { LANG_ORDER, type TranslationKey } from '../i18n/translations';
import type { Lang } from '../types';

const LABEL_KEYS: Record<Lang, TranslationKey> = {
  en: 'lang.en',
  hi: 'lang.hi',
  kn: 'lang.kn',
};

/** Dropdown switcher for English / हिन्दी / ಕನ್ನಡ. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.label')}
        className={`flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-200 ${
          compact ? 'px-2.5 py-2' : 'px-3 py-2'
        }`}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">{t(LABEL_KEYS[lang])}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('lang.label')}
          className="glass-strong absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl py-1 shadow-2xl"
        >
          {LANG_ORDER.map((code) => {
            const active = code === lang;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-200'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <span>{t(LABEL_KEYS[code])}</span>
                  {active && (
                    <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
