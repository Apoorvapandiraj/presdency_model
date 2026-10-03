import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Globe, WifiOff } from 'lucide-react';

import { REGULATION_CORPUS } from '../../../server/corpus';
import { useLanguage } from '../context/LanguageContext';
import { ActionChips } from './ActionChips';
import { SearchBar } from './SearchBar';

interface HeroSectionProps {
  onAsk: (query: string) => void;
  busy: boolean;
  onVoiceClick: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function StatCard({
  icon,
  value,
  label,
  hint,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900/80 text-emerald-300">
        {icon}
      </span>
      <span>
        <span className="block font-display text-lg font-bold text-slate-100">
          {value}
        </span>
        <span className="block text-xs font-medium text-slate-400">{label}</span>
        <span className="block text-[10px] text-slate-600">{hint}</span>
      </span>
    </div>
  );
}

/** Fullscreen hero: looping video, glassmorphism overlay, search + chips. */
export function HeroSection({ onAsk, busy, onVoiceClick }: HeroSectionProps) {
  const { t } = useLanguage();
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-28"
    >
      {/* Layer 1 — animated gradient base (visible if the video is missing) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0b1a2b_0%,#020617_55%,#020617_100%)]"
      />

      {/* Layer 2 — HTML5 looping background video */}
      {!videoFailed && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          aria-hidden="true"
        >
          <source src="/campus-loop.mp4" type="video/mp4" />
        </video>
      )}

      {/* Layer 3 — dark translucent glassmorphism overlay for text contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      {/* Layer 4 — grid veil + drifting aurora accents */}
      <div aria-hidden="true" className="grid-veil absolute inset-0" />
      <div
        aria-hidden="true"
        className="aurora left-[8%] top-[18%] h-72 w-72 bg-emerald-500/35"
      />
      <div
        aria-hidden="true"
        className="aurora bottom-[12%] right-[10%] h-80 w-80 bg-cyan-500/30"
        style={{ animationDelay: '-6s' }}
      />
      <div
        aria-hidden="true"
        className="aurora left-1/2 top-1/2 h-64 w-64 bg-indigo-500/25"
        style={{ animationDelay: '-12s' }}
      />

      {/* Content */}
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center"
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-emerald-200"
        >
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          {t('hero.badge')}
        </motion.div>

        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.55 }}
          className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          {t('hero.title')}{' '}
          <span className="text-gradient">{t('hero.titleAccent')}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="mt-5 max-w-2xl text-balance text-[15px] leading-relaxed text-slate-300/90 sm:text-base"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.65 }}
          className="mt-8 w-full max-w-2xl"
        >
          <SearchBar onSubmit={onAsk} busy={busy} onMicClick={onVoiceClick} />
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.7 }} className="mt-6 w-full">
          <ActionChips onSelect={onAsk} disabled={busy} />
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.75 }}
          className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <StatCard
            icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
            value={String(REGULATION_CORPUS.length)}
            label={t('hero.statClauses')}
            hint={t('hero.statClausesHint')}
          />
          <StatCard
            icon={<Globe className="h-4 w-4" aria-hidden="true" />}
            value="3"
            label={t('hero.statLangs')}
            hint={t('hero.statLangsHint')}
          />
          <StatCard
            icon={<WifiOff className="h-4 w-4" aria-hidden="true" />}
            value="24/7"
            label={t('hero.statFallback')}
            hint={t('hero.statFallbackHint')}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
