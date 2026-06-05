"use client";

/**
 * ErrorMessage.tsx — Friendly error display with an optional retry button.
 * Used when an API call fails or something goes wrong.
 *
 * Usage: <ErrorMessage message="Could not load activities" onRetry={() => refetch()} />
 */

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 px-6 py-8 text-center">
      {/* Warning icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-400"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <p className="mt-3 text-sm font-medium text-red-800">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 min-h-[44px] rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 active:scale-95"
        >
          נסה/י שוב
        </button>
      )}
    </div>
  );
}
