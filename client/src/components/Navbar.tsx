import { useEffect, useState } from 'react';
import { GraduationCap, Mic, Zap } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface NavbarProps {
  onVoiceClick: () => void;
  onAskClick: () => void;
}

/** Sticky glass navbar with brand, anchors, language + voice controls. */
export function Navbar({ onVoiceClick, onAskClick }: NavbarProps) {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled
          ? 'border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl shadow-lg shadow-slate-950/10'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
      >
        <a href="#top" className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.01]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-[15px] font-bold tracking-wide text-slate-100">
              Presidency University
            </span>
            <span className="block text-[11px] text-slate-300/80 transition group-hover:text-slate-200">
              {t('nav.tagline')}
            </span>
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-slate-200/80 transition duration-300 hover:text-emerald-300"
          >
            {t('nav.features')}
          </a>
          <a
            href="#pipeline"
            className="text-sm font-medium text-slate-200/80 transition duration-300 hover:text-emerald-300"
          >
            {t('nav.pipeline')}
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={onVoiceClick}
            aria-label={t('voice.open')}
            title={t('voice.open')}
            className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-2.5 text-slate-200 transition duration-300 hover:border-cyan-400/60 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onAskClick}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition duration-300 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            {t('nav.ask')}
          </button>
        </div>
      </nav>
    </header>
  );
}
