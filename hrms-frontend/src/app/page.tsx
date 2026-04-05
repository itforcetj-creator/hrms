"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";

const moduleKeys = ["recruitment", "records", "communication", "analytics"] as const;
const audienceKeys = ["hr", "managers", "employees"] as const;

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm backdrop-blur-xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
              {t("landing.badge.enterpriseSuite")}
            </p>
            <h1 className="text-lg font-bold sm:text-xl">HRMS</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition-all hover:from-sky-500 hover:to-indigo-500 active:scale-[0.98]"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        </header>

        <section className="app-surface relative overflow-hidden rounded-3xl border border-[var(--border)] p-8 shadow-xl backdrop-blur-xl sm:p-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />

          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">{t("landing.hero.label")}</p>
          <h2 className="mt-4 max-w-4xl text-3xl font-bold leading-tight sm:text-5xl">
            {t("landing.hero.title")}
          </h2>
          <p className="app-muted mt-5 max-w-3xl text-base leading-relaxed sm:text-lg">
            {t("landing.hero.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-600 dark:text-sky-300">
              {t("landing.tag.hiringCycles")}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-700 dark:text-emerald-300">
              {t("landing.tag.employeeData")}
            </span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 font-medium text-indigo-700 dark:text-indigo-300">
              {t("landing.tag.teamVisibility")}
            </span>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold sm:text-3xl">{t("landing.section.capabilitiesTitle")}</h3>
              <p className="app-muted mt-1">{t("landing.section.capabilitiesSubtitle")}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {moduleKeys.map((key) => (
              <article key={key} className="app-surface-strong rounded-2xl p-6 shadow-sm">
                <h4 className="text-lg font-semibold">{t(`landing.module.${key}.title`)}</h4>
                <p className="app-muted mt-2 leading-relaxed">{t(`landing.module.${key}.description`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {audienceKeys.map((key) => (
            <article key={key} className="app-surface-strong rounded-2xl p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                {t(`landing.audience.${key}.title`)}
              </p>
              <p className="app-muted mt-2">{t(`landing.audience.${key}.description`)}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center shadow-sm sm:px-10">
          <h3 className="text-2xl font-bold">{t("landing.cta.title")}</h3>
          <p className="app-muted mx-auto mt-2 max-w-2xl">
            {t("landing.cta.description")}
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-linear-to-r from-indigo-600 to-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:from-indigo-500 hover:to-sky-500 active:scale-[0.98]"
            >
              {t("landing.cta.button")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
