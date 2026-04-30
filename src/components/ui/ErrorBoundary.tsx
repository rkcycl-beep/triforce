"use client";

/**
 * ErrorBoundary.tsx — Catches JavaScript errors in child components.
 *
 * WHY: If the Garmin section crashes, we don't want the ENTIRE dashboard to break.
 * Wrapping each section in an ErrorBoundary means only that section shows an error,
 * while everything else keeps working.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <SomeComponentThatMightCrash />
 *   </ErrorBoundary>
 */

import { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      // Show fallback UI, or a default error message
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-700">
            Something went wrong loading this section.
          </div>
        )
      );
    }

    return this.props.children;
  }
}
