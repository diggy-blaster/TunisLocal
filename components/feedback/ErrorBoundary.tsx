import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center text-[var(--text-primary)] shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-[var(--text-secondary)]">Please refresh the page or try again later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
