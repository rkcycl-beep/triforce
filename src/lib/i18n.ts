/**
 * i18n.ts — Simple translation helper.
 *
 * Supports Hebrew (he) and English (en).
 * Default is Hebrew.
 */

import he from "@/i18n/he.json";
import en from "@/i18n/en.json";

export type Locale = "he" | "en";

const translations = { he, en };

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key into the active language.
 * Keys use dot notation: "dashboard.greeting" or "nav.settings".
 * If the key is missing, the key itself is returned (easy to spot).
 */
export function t(
  key: string,
  locale: Locale = "he",
  params?: Record<string, string | number>
): string {
  const value = getNestedValue(translations[locale], key);
  let result = value ?? key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }

  return result;
}
