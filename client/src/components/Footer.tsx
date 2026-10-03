import { useEffect, useState } from 'react';
import { ExternalLink, GraduationCap } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { fetchHealth } from '../lib/api';

const HANDBOOK_URL =
  'https://presidencyuniversity.in/assets/PDF/Academic-Regulations-2020.pdf';

/** Footer: disclaimer, resource links and live engine status pill. */
export function Footer() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>(
    'checking',
  );

  useEffect(() => {
    let cancelled = false;
    fetchHealth().then((health) => {
      if (!cancelled) setStatus(health.ok ? 'online' : 'offline');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="relative border-t border-slate-900 bg-slate-950/80 px-4 pb-10 pt-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-indigo-500 text-slate-950">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-sm font-bold text-slate-100">
              {t('nav.brand')}{' '}
              <span className="font-normal text-slate-500">
                · {t('nav.tagline')}
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
            {t('footer.disclaimer')}
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('footer.product')}
          </p>
          <ul className="space-y-2.5">
            <li>
              <a
                href="#features"
                className="text-slate-400 transition hover:text-emerald-300"
              >
                {t('footer.linkFeatures')}
              </a>
            </li>
            <li>
              <a
                href="#pipeline"
                className="text-slate-400 transition hover:text-emerald-300"
              >
                {t('footer.linkPipeline')}
              </a>
            </li>
            <li>
              <a
                href="#top"
                className="text-slate-400 transition hover:text-emerald-300"
              >
                {t('footer.linkAsk')}
              </a>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('footer.resources')}
          </p>
          <ul className="space-y-2.5">
            <li>
              <a
                href={HANDBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-slate-400 transition hover:text-emerald-300"
              >
                {t('footer.linkHandbook')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
            <li className="text-slate-500">{t('footer.source')}</li>
            <li className="flex items-center gap-2 pt-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === 'online'
                    ? 'bg-emerald-400'
                    : status === 'offline'
                      ? 'bg-amber-400'
                      : 'animate-pulse bg-slate-500'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-500">
                {t('footer.engineStatus')}:{' '}
                {status === 'online'
                  ? t('chat.engineGemini')
                  : status === 'offline'
                    ? t('chat.engineLocal')
                    : '…'}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-6xl border-t border-slate-900 pt-6 text-center text-[11px] text-slate-600">
        {t('footer.rights')}
      </p>
    </footer>
  );
}
