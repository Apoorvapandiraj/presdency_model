import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Copy, FileText, X } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import type { Citation } from '../types';

interface CitationDrawerProps {
  open: boolean;
  citations: Citation[];
  /** Which citation starts expanded. */
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Collapsible right-side drawer exposing citation metadata for every claim:
 * Clause ID, section title, page number and the verbatim handbook snippet.
 */
export function CitationDrawer({
  open,
  citations,
  initialIndex = 0,
  onClose,
}: CitationDrawerProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(initialIndex);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) setExpanded(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handleCopy = async (citation: Citation, index: number) => {
    const payload =
      `${citation.clauseId} — ${citation.sectionTitle} (p. ${citation.page})\n` +
      `${citation.document}\n\n${citation.snippet}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      // Clipboard can be blocked — the text stays selectable inside the drawer.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label={t('drawer.close')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 cursor-default bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t('drawer.title')}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-display flex items-center gap-2 text-base font-bold text-slate-100">
                  <FileText className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  {t('drawer.title')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('drawer.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('drawer.close')}
                className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {citations.length === 0 && (
                <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
                  {t('drawer.none')}
                </p>
              )}

              {citations.map((citation, index) => {
                const isOpen = expanded === index;
                return (
                  <div
                    key={`${citation.clauseId}-${index}`}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? -1 : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60"
                    >
                      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                        {citation.clauseId}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-200">
                          {citation.sectionTitle}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {t('drawer.page')} {citation.page} · {t('drawer.match')}{' '}
                          {Math.round(citation.score * 100)}%
                        </span>
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-800 px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-400">
                            {t('drawer.clause')}: {citation.clauseId}
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-400">
                            {t('drawer.page')}: {citation.page}
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-1 text-slate-400">
                            {t('drawer.match')}:{' '}
                            {Math.round(citation.score * 100)}%
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          <span className="text-slate-400">
                            {t('drawer.document')}:
                          </span>{' '}
                          {citation.document}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {t('drawer.verbatimLabel')}
                        </p>
                        <blockquote
                          lang="en"
                          className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border-l-2 border-emerald-500/70 bg-slate-950/80 p-3.5 font-serif text-[13px] leading-relaxed text-slate-300"
                        >
                          {citation.snippet}
                        </blockquote>
                        <button
                          type="button"
                          onClick={() => handleCopy(citation, index)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check
                                className="h-3.5 w-3.5 text-emerald-400"
                                aria-hidden="true"
                              />
                              {t('drawer.copied')}
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('drawer.copy')}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <footer className="border-t border-slate-800 px-5 py-3">
              <p className="text-[11px] leading-relaxed text-slate-600">
                {t('drawer.disclaimer')}
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

