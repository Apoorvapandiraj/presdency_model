import { motion } from 'framer-motion';
import { DatabaseZap, ShieldCheck, Shuffle, Sparkles } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const STAGES = [
  { icon: Shuffle, titleKey: 'pipeline.stage1Title', bodyKey: 'pipeline.stage1Body' },
  { icon: DatabaseZap, titleKey: 'pipeline.stage2Title', bodyKey: 'pipeline.stage2Body' },
  { icon: Sparkles, titleKey: 'pipeline.stage3Title', bodyKey: 'pipeline.stage3Body' },
  { icon: ShieldCheck, titleKey: 'pipeline.stage4Title', bodyKey: 'pipeline.stage4Body' },
] as const;

/** Four-stage RAG pipeline explainer (mirrors the backend exactly). */
export function HowItWorksSection() {
  const { t } = useLanguage();

  return (
    <section id="pipeline" className="relative px-4 py-24 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-slate-700/70 to-transparent"
      />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('pipeline.title')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            {t('pipeline.subtitle')}
          </p>
        </motion.div>

        <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.li
                key={stage.titleKey}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className="glass relative rounded-2xl p-6"
              >
                <span className="absolute right-5 top-5 font-display text-3xl font-extrabold text-slate-800">
                  {index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/80 text-cyan-300 ring-1 ring-cyan-500/25">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-4 text-[15px] font-semibold text-slate-100">
                  {t(stage.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(stage.bodyKey)}
                </p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
