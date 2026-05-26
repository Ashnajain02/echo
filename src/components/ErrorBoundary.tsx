import React from 'react';
import { logger } from '@/lib/logger';

interface Props {
  /** Optional human-readable label that identifies which subtree threw. */
  scope?: string;
  /** Optional custom fallback. If omitted, the default editorial fallback is used. */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time and lifecycle errors in its subtree, logs them to the
 * structured logger (so we can wire Sentry without touching call sites), and
 * shows a calm editorial fallback that matches the rest of the UI.
 *
 * Note: error boundaries do NOT catch errors in event handlers, async code,
 * or effects — those still need try/catch + logger.error.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(
      this.props.scope ? `ErrorBoundary:${this.props.scope}` : 'ErrorBoundary',
      error,
      { componentStack: errorInfo.componentStack },
    );
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(error, this.reset)
        : this.props.fallback;
    }

    return <DefaultErrorFallback error={error} reset={this.reset} />;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, reset }) => (
  <div className="min-h-[60vh] flex items-center justify-center px-6">
    <div className="max-w-md text-center">
      <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground/60 mb-4">
        Something broke
      </p>
      <h2 className="font-display text-3xl md:text-4xl font-normal text-foreground tracking-tight mb-4">
        This page hit a snag.
      </h2>
      <p className="font-display italic text-muted-foreground/80 mb-6 leading-relaxed">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-2 text-sm transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.assign('/')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go home
        </button>
      </div>
    </div>
  </div>
);

export default ErrorBoundary;
