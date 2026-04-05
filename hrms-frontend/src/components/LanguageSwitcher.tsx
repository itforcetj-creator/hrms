"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { type Locale, localeNames } from "@/lib/i18n";

const LOCALES: Locale[] = ["ru", "tj"];

interface LanguageSwitcherProps {
  /** Extra CSS classes to apply to the wrapper */
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = "" }) => {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--surface)] ${className}`}
      role="group"
      aria-label="Language switcher"
    >
      {LOCALES.map((loc, idx) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          aria-pressed={locale === loc}
          className={`
            px-3 py-1.5 text-xs font-bold tracking-wider transition-all
            ${idx < LOCALES.length - 1 ? "border-r border-[var(--border)]" : ""}
            ${
              locale === loc
                ? "bg-[var(--accent)] text-white shadow-inner"
                : "text-[var(--foreground)] opacity-50 hover:opacity-80 hover:bg-[var(--surface-hover)]"
            }
          `}
        >
          {localeNames[loc]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
