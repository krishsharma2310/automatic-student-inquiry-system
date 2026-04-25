/**
 * ErrorBoundary
 * ------------------------------------------------------------------
 * Global React error boundary for catching render/runtime errors.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import '../styles/components/ErrorBoundary.css';

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */

function getErrorMessage(error: Error | null): string {
  if (!error?.message) {
    return 'An unexpected error occurred.';
  }

  try {
    const parsed = JSON.parse(error.message);

    if (parsed?.error && parsed?.operationType) {
      let message = `Firestore Error: ${parsed.error} during ${parsed.operationType}`;

      if (parsed.path) {
        message += ` at ${parsed.path}`;
      }

      if (
        typeof parsed.error === 'string' &&
        parsed.error.includes('Missing or insufficient permissions')
      ) {
        message += '. Please check security rules.';
      }

      return message;
    }

    return error.message;
  } catch {
    return error.message;
  }
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const message = getErrorMessage(this.state.error);

      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h1 className="error-boundary-title">
              Something went wrong
            </h1>

            <p className="error-boundary-message">
              {message}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="error-boundary-btn"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

