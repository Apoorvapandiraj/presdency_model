import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, MicOff, Volume2, X } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import {
  getSpeechRecognition,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from '../lib/speech';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceAssistantModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Runs the normal ask pipeline for the transcript and resolves with the
   * text that should be spoken back (or null for nothing to speak).
   */
  onSubmit: (query: string) => Promise<string | null>;
}

/**
 * Voice assistant modal: Web Speech API (STT + TTS) with a real-time audio
 * visualiser driven by the Web Audio API AnalyserNode.
 */
export function VoiceAssistantModal({
  open,
  onClose,
  onSubmit,
}: VoiceAssistantModalProps) {
  const { t, lang, voiceLang } = useLanguage();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<VoiceState>('idle');
  stateRef.current = state;

  const teardownMedia = () => {
    try {
      recognitionRef.current?.abort();
    } catch {
      // Recognition may already be stopped.
    }
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    cancelAnimationFrame(rafRef.current);
  };

  const startListening = async () => {
    setError(null);
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError(t('voice.notSupported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch {
      setError(t('voice.denied'));
      return;
    }

    const recognition = new Recognition();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      const last = event.results[event.results.length - 1];
      if (last?.isFinal) {
        void handleFinal(text);
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        setError(t('voice.denied'));
        setState('idle');
        teardownMedia();
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState('listening');
    } catch {
      setState('idle');
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore — already stopped.
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    setState('idle');
  };

  const handleFinal = async (raw: string) => {
    const query = raw.trim();
    if (query.length === 0) {
      setState('idle');
      return;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore.
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;

    setState('processing');
    try {
      const answer = await onSubmit(query);
      if (answer && answer.trim().length > 0) {
        const speaking = speakText(answer, {
          lang,
          onEnd: () => setState('idle'),
          onError: () => setState('idle'),
        });
        setState(speaking ? 'speaking' : 'idle');
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  };
  /* Lifecycle: start on open, tear everything down on close. */
  useEffect(() => {
    if (!open) {
      teardownMedia();
      stopSpeaking();
      setState('idle');
      setTranscript('');
      setError(null);
      return;
    }
    void startListening();
    return () => {
      teardownMedia();
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Live audio visualisation (AnalyserNode → canvas bars). */
  useEffect(() => {
    if (!open) return;

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.floor(width * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const data =
        analyser && stateRef.current === 'listening'
          ? new Uint8Array(analyser.frequencyBinCount)
          : null;
      if (analyser && data) analyser.getByteFrequencyData(data);

      const bars = 44;
      const gap = 3;
      const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars);
      const time = performance.now() / 260;
      const current = stateRef.current;

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#34d399');
      gradient.addColorStop(0.5, '#22d3ee');
      gradient.addColorStop(1, '#818cf8');
      ctx.fillStyle = gradient;

      for (let i = 0; i < bars; i += 1) {
        let amplitude: number;
        if (data) {
          const bin = Math.floor((i / bars) * data.length);
          amplitude = (data[bin] ?? 0) / 255;
        } else if (current === 'processing') {
          amplitude = 0.22 + 0.2 * Math.sin(time * 2.4 + i * 0.45);
        } else if (current === 'speaking') {
          amplitude =
            0.3 + 0.45 * Math.abs(Math.sin(time * 3.1 + i * 0.8));
        } else if (current === 'listening') {
          amplitude = 0.1 + 0.06 * Math.sin(time + i * 0.5);
        } else {
          amplitude = 0.07 + 0.035 * Math.sin(time * 0.7 + i * 0.35);
        }
        const barHeight = Math.max(3, amplitude * (height - 10));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleToggle = () => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'speaking') {
      stopSpeaking();
      setState('idle');
    } else if (state === 'idle') {
      void startListening();
    }
  };

  const statusText =
    state === 'listening'
      ? t('voice.listening')
      : state === 'processing'
        ? t('voice.processing')
        : state === 'speaking'
          ? t('voice.speaking')
          : t('voice.idle');
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('voice.title')}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ duration: 0.28 }}
            className="glass-strong fixed left-1/2 top-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950">
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-100">
                    {t('voice.title')}
                  </h2>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        state === 'listening'
                          ? 'animate-pulse bg-emerald-400'
                          : state === 'processing'
                            ? 'animate-pulse bg-amber-400'
                            : state === 'speaking'
                              ? 'animate-pulse bg-cyan-400'
                              : 'bg-slate-500'
                      }`}
                    />
                    {statusText}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('voice.close')}
                className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Real-time waveform (Web Audio API AnalyserNode) */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className="mt-5 h-28 w-full rounded-2xl border border-slate-800 bg-slate-900/70"
            />

            {/* Live transcript */}
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t('voice.transcript')}
              </p>
              <p
                className={`mt-1.5 min-h-[2.5rem] text-sm leading-relaxed ${
                  transcript ? 'text-slate-200' : 'text-slate-600'
                }`}
              >
                {transcript || t('voice.idle')}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200"
              >
                {error}
              </p>
            )}

            {/* Controls */}
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleToggle}
                disabled={state === 'processing'}
                aria-label={
                  state === 'listening' ? t('voice.stop') : t('voice.start')
                }
                className={`flex h-16 w-16 items-center justify-center rounded-full text-slate-950 shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  state === 'listening'
                    ? 'animate-pulse bg-rose-400 hover:bg-rose-300'
                    : 'bg-emerald-400 hover:bg-emerald-300'
                }`}
              >
                {state === 'listening' ? (
                  <MicOff className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Mic className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-600">
              {t('voice.hint')}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


