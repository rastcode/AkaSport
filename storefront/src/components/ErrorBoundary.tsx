"use client";

/**
 * Generic React error boundary (RTL / Persian fallback).
 *
 * Wrap interactive client subtrees (chat, dashboard widgets) so a runtime
 * error in one panel never takes down the whole page.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Short Persian label describing the failed area (for the default UI). */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this would report to an error-tracking service.
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback, label } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);
      return (
        <div
          dir="rtl"
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-center"
        >
          <p className="font-semibold text-red-700">
            {label ? `بارگذاری ${label} با خطا مواجه شد.` : "خطایی رخ داد."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-3 rounded-lg bg-bondi-blue px-4 py-2 text-sm font-semibold text-white hover:bg-bondi-blue-dark"
          >
            تلاش مجدد
          </button>
        </div>
      );
    }

    return children;
  }
}
