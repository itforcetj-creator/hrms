import ru from "./ru";
import tj from "./tj";

export type Locale = "ru" | "tj";

export const translations: Record<Locale, Record<string, string>> = { ru, tj };

export const localeNames: Record<Locale, string> = {
  ru: "RU",
  tj: "TJ",
};

export const defaultLocale: Locale = "ru";
