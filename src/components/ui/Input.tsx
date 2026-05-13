"use client";

/**
 * Input — labeled text input with optional error message.
 *
 * Used by the coach sign-up/sign-in forms and group-create form.
 * Keep this minimal; richer form ergonomics live in Phase 1F (forms audit).
 */

import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  name,
  className = "",
  ...rest
}: InputProps) {
  const inputId = id ?? name;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        name={name}
        className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""
        } ${className}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
