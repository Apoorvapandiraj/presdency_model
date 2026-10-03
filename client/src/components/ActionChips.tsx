import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

/** Ready-made queries mapped to the three spec chips + two extras. */
const CHIPS: Array<{ key: TranslationKey; query: string }> = [
  {
    key: 'chips.attendance',
    query:
      'My attendance is short in one subject — can I get it condoned and write the exam?',
  },
  {
    key: 'chips.promotion',
    query:
      'My CGPA is below 4.00 after 2nd year — will I be detained or promoted to 3rd year?',
  },
  {
    key: 'chips.makeup',
    query: 'What is the grade cap in a Make-Up Examination?',
  },
  {
    key: 'chips.reval',
    query: 'I want to see my answer script and apply for grade review / revaluation.',
  },
  {
    key: 'chips.cgpa',
    query: 'How is my pointer (CGPA) calculated?',
  },
];

interface ActionChipsProps {
  onSelect: (query: string) => void;
  disabled?: boolean;
}

/** Action chips under the hero search bar. */
export function ActionChips({ onSelect, disabled = false }: ActionChipsProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full">
      <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
        {t('chips.label')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {CHIPS.map((chip, index) => (
          <motion.button
            key={chip.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip.query)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + index * 0.07, duration: 0.35 }}
            className="glass rounded-full px-4 py-2 text-[13px] font-medium text-slate-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t(chip.key)}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
