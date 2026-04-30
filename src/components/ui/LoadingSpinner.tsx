/**
 * LoadingSpinner.tsx — A simple animated spinner for loading states.
 * Server Component (no 'use client' needed — it's just visual, no interactivity).
 *
 * Usage: <LoadingSpinner /> or <LoadingSpinner size="lg" />
 */

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
};

export default function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
