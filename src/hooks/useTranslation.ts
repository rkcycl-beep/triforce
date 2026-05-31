import { useLocale } from "@/providers/LocaleProvider";
import { t as translate, type Locale } from "@/lib/i18n";
import { useCallback } from "react";

/**
 * useTranslation — React hook that returns a t() function bound to the current locale.
 *
 * Usage:
 *   const { t, locale } = useTranslation();
 *   <h1>{t("dashboard.greeting", { name: "Dan" })}</h1>
 */
export function useTranslation() {
  const { locale } = useLocale();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, locale, params);
    },
    [locale]
  );

  return { t, locale };
}

/**
 * Helper for server components or non-React code.
 * Defaults to Hebrew if no locale is provided.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(key, "he", params);
}
