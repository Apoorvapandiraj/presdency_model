import { useCallback, useRef, useState } from 'react';

import { ChatPanel } from './components/ChatPanel';
import { CitationDrawer } from './components/CitationDrawer';
import { FeaturesSection } from './components/FeaturesSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Navbar } from './components/Navbar';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { useLanguage } from './context/LanguageContext';
import { ApiError, askQuestion } from './lib/api';
import {
  appendHistory,
  getSessionId,
  loadHistory,
  loadProfile,
  saveProfile,
} from './lib/session';
import type { ChatMessage, Citation, StudentProfile } from './types';

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `msg-${messageSeq}-${Date.now()}`;
}

export default function App() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    citations: Citation[];
    index: number;
  }>({ open: false, citations: [], index: 0 });
  const lastQueryRef = useRef<string | null>(null);
  // Phase 2 — session state (localStorage-backed, see src/lib/session.ts).
  const sessionIdRef = useRef<string>(getSessionId());
  const [profile, setProfile] = useState<StudentProfile>(() => loadProfile());

  const scrollToChat = useCallback(() => {
    window.setTimeout(() => {
      document
        .getElementById('chat')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 140);
  }, []);

  /**
   * Core ask pipeline used by the hero search, action chips, chat composer,
   * follow-up suggestions and the voice assistant. Returns the text to speak
   * (direct answer + explanation) or null on failure.
   */
  const runAsk = useCallback(
    async (query: string): Promise<string | null> => {
      const trimmed = query.trim();
      if (trimmed.length === 0 || busy) return null;
      lastQueryRef.current = trimmed;
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', text: trimmed, createdAt: Date.now() },
      ]);

      try {
        const envelope = await askQuestion(trimmed, lang, {
          sessionId: sessionIdRef.current,
          profile,
          history: loadHistory(),
        });
        const data = envelope.data;
        // Phase 2 — persist any profile fields extracted server-side.
        if (data.profile && Object.keys(data.profile).length > 0) {
          setProfile(saveProfile(data.profile));
        }
        appendHistory(trimmed, data.directAnswer);
        const assistant: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          text: data.directAnswer,
          explanation: data.explanation,
          citations: data.citations,
          kind: data.kind,
          engine: data.engine,
          intentCategory: data.intent.category,
          language: data.language,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistant]);
        return `${data.directAnswer} ${data.explanation}`.trim();
      } catch (error) {
        let errorMessage: string;
        let retryAfter: number | undefined;

        if (error instanceof ApiError) {
          if (
            error.code === 'RATE_LIMITED' ||
            error.code === 'CLIENT_RATE_LIMITED'
          ) {
            retryAfter = error.retryAfterSeconds ?? 60;
            errorMessage = t('chat.rateLimited').replace(
              '{seconds}',
              String(retryAfter),
            );
          } else {
            errorMessage = error.message;
          }
        } else {
          errorMessage = t('errors.generic');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: '',
            isError: true,
            errorMessage,
            retryAfterSeconds: retryAfter,
            createdAt: Date.now(),
          },
        ]);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, lang, t, profile],
  );
  const handleAsk = useCallback(
    (query: string) => {
      void runAsk(query);
    },
    [runAsk],
  );

  const handleHeroAsk = useCallback(
    (query: string) => {
      void runAsk(query).then(() => scrollToChat());
    },
    [runAsk, scrollToChat],
  );

  const retryLast = useCallback(() => {
    const query = lastQueryRef.current;
    if (!query) return;
    setMessages((prev) => {
      let errorIndex = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].isError) {
          errorIndex = i;
          break;
        }
      }
      return errorIndex === -1 ? prev : prev.filter((_, i) => i !== errorIndex);
    });
    void runAsk(query);
  }, [runAsk]);

  const openCitations = useCallback(
    (citations: Citation[], index = 0) => {
      setDrawer({ open: true, citations, index });
    },
    [],
  );

  const closeDrawer = useCallback(() => {
    setDrawer((current) => ({ ...current, open: false }));
  }, []);

  const openVoice = useCallback(() => setVoiceOpen(true), []);
  const closeVoice = useCallback(() => setVoiceOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar onVoiceClick={openVoice} onAskClick={scrollToChat} />

      <main>
        <HeroSection
          onAsk={handleHeroAsk}
          busy={busy}
          onVoiceClick={openVoice}
        />

        <div className="relative z-10 mx-auto -mt-12 w-full max-w-6xl px-4 pb-20 sm:px-6">
          <ChatPanel
            messages={messages}
            busy={busy}
            onSend={handleAsk}
            onRetryLast={retryLast}
            onOpenCitations={openCitations}
          />
        </div>

        <FeaturesSection />
        <HowItWorksSection />
      </main>

      <Footer />

      <CitationDrawer
        open={drawer.open}
        citations={drawer.citations}
        initialIndex={drawer.index}
        onClose={closeDrawer}
      />

      <VoiceAssistantModal
        open={voiceOpen}
        onClose={closeVoice}
        onSubmit={runAsk}
      />
    </div>
  );
}

