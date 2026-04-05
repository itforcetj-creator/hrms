"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { type Locale, translations, defaultLocale } from "@/lib/i18n";

const STORAGE_KEY = "hrms-lang";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, data?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === "ru" || stored === "tj")) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage not available (SSR / private mode)
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, data?: Record<string, string | number>): string => {
      let str = translations[locale][key] ?? key;
      if (data) {
        Object.entries(data).forEach(([rk, rv]) => {
          str = str.replace(new RegExp(`{{${rk}}}`, "g"), String(rv));
        });
      }
      return str;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
