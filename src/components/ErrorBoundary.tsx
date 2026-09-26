import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught component error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[280px] w-full flex items-center justify-center p-6 bg-cream-50">
          <div className="max-w-md w-full rounded-2xl bg-white border border-rose-100 p-6 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-medium text-berry-700">Something went wrong</h3>
            <p className="mt-1 text-xs text-berry-400">
              {this.state.error?.message || 'An unexpected rendering error occurred. Please try again.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-blush-500 px-5 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-blush-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
