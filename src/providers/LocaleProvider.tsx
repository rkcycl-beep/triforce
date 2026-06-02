"use client";

/**
 * LocaleProvider — Manages Hebrew / English locale + RTL/LTR direction.
 *
 * - Default: Hebrew (RTL)
 * - Persists choice to localStorage AND cookie (so server components can read it)
 * - Updates <html> lang + dir attributes when locale changes
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Locale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "he",
  dir: "rtl",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  children: React.ReactNode;
}

function setLocaleCookie(locale: Locale) {
  try {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    // ignore
  }
}

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "en" || saved === "he") return saved;
  } catch {
    // localStorage not available
  }
  return "he";
}

export default function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // Sync <html> attributes whenever locale changes (including initial)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
    }
  }, [locale]);

  // When locale changes, update <html> attributes and persist
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    const dir = next === "he" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
      document.documentElement.dir = dir;
    }
    try {
      localStorage.setItem("locale", next);
    } catch {
      // ignore
    }
    setLocaleCookie(next);
  }, []);

  const dir = locale === "he" ? "rtl" : "ltr";

  return (
    <LocaleContext.Provider value={{ locale, dir, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
