import { useEffect, useRef, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUp,
  BookOpenCheck,
  Bot,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import type { Citation, ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (query: string) => void;
  onRetryLast: () => void;
  onOpenCitations: (citations: Citation[], index?: number) => void;
}

const ENGINE_KEY = {
  gemini: 'chat.engineGemini',
  'local-fallback': 'chat.engineLocal',
  guard: 'chat.engineGuard',
} as const;

const KIND_KEY = {
  answer: 'chat.directAnswer',
  refusal: 'chat.refusal',
  greeting: 'chat.greeting',
  onboarding: 'chat.onboarding',
} as const;

function AssistantBubble({
  message,
  onOpenCitations,
}: {
  message: ChatMessage;
  onOpenCitations: (citations: Citation[], index?: number) => void;
}) {
  const { t } = useLanguage();
  const citations = message.citations ?? [];
  const kind = message.kind ?? 'answer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex gap-3"
    >
      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
        <Bot className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 space-y-3">
        {/* Meta row: kind label + engine badge + latency */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              kind === 'refusal'
                ? 'bg-amber-500/15 text-amber-300'
                : kind === 'onboarding'
                  ? 'bg-violet-500/15 text-violet-300'
                  : kind === 'greeting'
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {kind === 'refusal' ? (
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            )}
            {t(KIND_KEY[kind])}
          </span>
          {message.engine && (
            <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {t(ENGINE_KEY[message.engine])}
            </span>
          )}
        </div>

        {/* DIRECT ANSWER FIRST — 1–3 plain sentences (whitespace-pre-line so
            multi-line welcome/instruction blocks render correctly) */}
        <p className="whitespace-pre-line text-[17px] font-medium leading-relaxed text-slate-100">
          {message.text}
        </p>

        {/* Rule logic explanation (always paraphrased, never verbatim) */}
        {message.explanation && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('chat.why')}
            </p>
            <p className="text-sm leading-relaxed text-slate-300">
              {message.explanation}
            </p>
          </div>
        )}

        {/* Citation pills → drawer */}
        {citations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('chat.sources')}
            </span>
            {citations.map((citation, index) => (
              <button
                key={`${citation.clauseId}-${index}`}
                type="button"
                onClick={() => onOpenCitations(citations, index)}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:border-emerald-400/70 hover:bg-emerald-500/20"
                title={citation.sectionTitle}
              >
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {citation.clauseId}
                <span className="hidden max-w-[180px] truncate text-emerald-300/70 sm:inline">
                  {citation.sectionTitle}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-emerald-500/15 px-4 py-2.5 text-[15px] leading-relaxed text-emerald-50 ring-1 ring-emerald-400/25">
        <span className="sr-only">{t('chat.you')}: </span>
        {message.text}
      </div>
    </motion.div>
  );
}
/** Main chat panel: history + loading state + suggestions + composer. */
export function ChatPanel({
  messages,
  busy,
  onSend,
  onRetryLast,
  onOpenCitations,
}: ChatPanelProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length, busy]);

  const lastMessage = messages[messages.length - 1];
  const showSuggestions =
    !busy && lastMessage?.role === 'assistant' && !lastMessage.isError;
  const lastError = [...messages].reverse().find((m) => m.isError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = inputRef.current?.value.trim() ?? '';
    if (query.length === 0 || busy) return;
    onSend(query);
    if (inputRef.current) inputRef.current.value = '';
  };

  const suggestions = [
    t('chat.suggestion1'),
    t('chat.suggestion2'),
    t('chat.suggestion3'),
  ];

  return (
    <section
      id="chat"
      aria-label={t('chat.placeholder')}
      className="glass-strong mx-auto flex h-[min(76vh,760px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/40"
    >
      <header className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold text-slate-100">
            {t('chat.assistant')}
          </p>
          <p className="truncate text-xs text-slate-500">{t('welcome.title')}</p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {t('hero.badge')}
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6"
      >
        <div className="glass rounded-2xl p-4">
          <p className="font-display text-sm font-bold text-slate-100">
            {t('welcome.title')}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
            {t('welcome.body')}
          </p>
        </div>

        {messages.map((message) =>
          message.role === 'user' ? (
            <UserBubble key={message.id} message={message} />
          ) : message.isError ? (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                <p className="text-sm font-semibold text-rose-200">
                  {t('chat.errorTitle')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-rose-200/80">
                  {message.errorMessage}
                </p>
                {message.id === lastError?.id && (
                  <button
                    type="button"
                    onClick={onRetryLast}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/30"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('chat.retry')}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <AssistantBubble
              key={message.id}
              message={message}
              onOpenCitations={onOpenCitations}
            />
          ),
        )}

        {busy && (
          <div className="flex gap-3" aria-live="polite">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <p className="text-sm text-slate-400">{t('chat.thinking')}</p>
              <div className="h-3 w-2/3 overflow-hidden rounded-full bg-slate-800/80">
                <div className="animate-shimmer h-full w-full bg-gradient-to-r from-emerald-500/0 via-emerald-400/70 to-cyan-400/0" />
              </div>
            </div>
          </div>
        )}
        {showSuggestions && (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('chat.followups')}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSend(suggestion)}
                  className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800/80 bg-slate-950/60 p-3 sm:p-4"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 focus-within:border-emerald-500/50">
          <input
            ref={inputRef}
            type="text"
            maxLength={600}
            autoComplete="off"
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label={t('chat.send')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-slate-600">
          {t('drawer.disclaimer')}
        </p>
      </form>
    </section>
  );
}


