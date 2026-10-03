import { motion } from 'framer-motion';
import { FileSearch, Languages, MessageCircleQuestion, ShieldCheck } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

const CARDS = [
  { icon: MessageCircleQuestion, titleKey: 'features.card1Title', bodyKey: 'features.card1Body' },
  { icon: ShieldCheck, titleKey: 'features.card2Title', bodyKey: 'features.card2Body' },
  { icon: FileSearch, titleKey: 'features.card3Title', bodyKey: 'features.card3Body' },
  { icon: Languages, titleKey: 'features.card4Title', bodyKey: 'features.card4Body' },
] as const;

/** "Built for zero-hallucination answers" — four safety-layer cards. */
export function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section id="features" className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.titleKey}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="glass group rounded-2xl p-6 transition hover:border-emerald-400/40"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 ring-1 ring-emerald-500/25 transition group-hover:ring-emerald-400/50">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-4 text-base font-semibold text-slate-100">
                  {t(card.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(card.bodyKey)}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
