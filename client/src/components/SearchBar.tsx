import { useState, type FormEvent } from 'react';
import { Loader2, Mic, Search } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface SearchBarProps {
  onSubmit: (query: string) => void;
  busy?: boolean;
  onMicClick?: () => void;
}

/** Central glass search bar with submit + optional voice shortcut. */
export function SearchBar({ onSubmit, busy = false, onMicClick }: SearchBarProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (query.length === 0 || busy) return;
    onSubmit(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="glass-strong w-full rounded-2xl p-2 shadow-2xl shadow-emerald-500/5"
    >
      <div className="flex items-center gap-1.5">
        <Search
          className="ml-2 h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.ariaLabel')}
          maxLength={600}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        {onMicClick && (
          <button
            type="button"
            onClick={onMicClick}
            aria-label={t('search.micLabel')}
            title={t('search.micLabel')}
            className="rounded-xl border border-slate-700/80 p-2.5 text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-300"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          disabled={busy || value.trim().length === 0}
          className="flex min-w-[92px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t('search.submit')}
        </button>
      </div>
    </form>
  );
}
