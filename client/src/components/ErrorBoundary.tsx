import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translations } from '../i18n/translations';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Full-app React ErrorBoundary. Class component (hooks cannot catch render
 * errors). Texts are read directly from the dictionary since hooks are not
 * available here; English is used as the safe default.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] render failure:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const dict = translations.en.errors;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="glass-strong w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-slate-100">
            {dict.boundaryTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {dict.boundaryBody}
          </p>
          <pre className="mt-4 max-h-24 overflow-auto rounded-lg bg-slate-900/80 p-3 text-left text-[11px] text-rose-300">
            {error.message}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {dict.reload}
          </button>
        </div>
      </div>
    );
  }
}
