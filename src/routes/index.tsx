import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, FileText, ShieldCheck, Languages, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { CREDIT_PACKS, formatCreditPrice } from "@/lib/credit-catalog";
import {
  LANDING_COPY,
  LANDING_LANGS,
  LANDING_LANG_LABELS,
  LANDING_LANGUAGE_NAMES,
  detectLandingLang,
  saveLandingLang,
  type LandingLang,
} from "@/lib/landing-i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TraduChat — Chat con traduzione istantanea e videocall" },
      {
        name: "description",
        content:
          "Comunica istantaneamente con chiunque nel mondo: chat, videochiamate e traduzioni nella tua lingua. Crea e lavora con la tua community. TraduChat 🌐",
      },
      { property: "og:title", content: "TraduChat — Chat con traduzione istantanea e videocall" },
      {
        property: "og:description",
        content:
          "Comunica istantaneamente con chiunque nel mondo: chat, videochiamate e traduzioni nella tua lingua. Crea e lavora con la tua community. TraduChat 🌐",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://traduchat.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://traduchat.app/" }],
  }),
  component: Landing,
});

const ICONS = [QrCode, FileText, ShieldCheck, Video];

function Landing() {
  const [lang, setLang] = useState<LandingLang>("it");
  useEffect(() => {
    setLang(detectLandingLang());
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const t = LANDING_COPY[lang];

  function change(value: string) {
    const next = value as LandingLang;
    setLang(next);
    saveLandingLang(next);
  }

  const packs = CREDIT_PACKS.map((p) => `${p.credits} ${t.credits} ${t.at} ${formatCreditPrice(p.amount)}`).join(", ");

  return (
    <div translate="no" className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <img
            src="/logo-apertura.png"
            alt={`Logo TraduChat — ${t.kicker}`}
            width={768}
            height={768}
            className="size-10 shrink-0 rounded-[24%] object-cover"
          />
          <p className="font-display text-lg leading-tight">
            <span className="text-foreground">Tradu</span>
            <span className="text-primary">Chat</span>
          </p>
          <label className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card px-2">
            <Languages className="size-4 text-muted-foreground" aria-hidden />
            <select
              aria-label="Lingua / Language"
              value={lang}
              onChange={(e) => change(e.target.value)}
              className="h-9 bg-transparent pr-1 text-sm text-foreground outline-none"
            >
              {LANDING_LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANDING_LANG_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
          <Link to="/auth" className="shrink-0">
            <Button size="sm" className="rounded-full px-5">
              {t.login}
            </Button>
          </Link>
        </header>

        <section className="mt-10 flex flex-col items-center text-center sm:mt-14">
          <h1 className="max-w-2xl">
            <span className="block text-xs font-semibold uppercase text-primary">{t.kicker}</span>
            <span className="carattere-lineare mt-4 block font-sans text-[1.85rem] font-extrabold leading-[1.08] text-foreground sm:text-4xl">
              {t.title}
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-muted-foreground">{t.intro}</p>
        </section>

        <section className="mt-16 grid gap-3 sm:grid-cols-2">
          {t.features.map((f, i) => {
            const Icon = ICONS[i] ?? QrCode;
            return (
              <div
                key={i}
                className="rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <Icon className="size-5 text-primary" />
                <p className="mt-4 font-sans text-base font-bold">{f.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-10 rounded-3xl border border-border bg-card p-5 text-sm" aria-labelledby="lingue">
          <h2 id="lingue" className="font-sans text-base font-bold">
            {t.languagesTitle} · {LANDING_LANGUAGE_NAMES.length}
          </h2>
          <p className="mt-2 text-muted-foreground">{t.languagesText}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {LANDING_LANGUAGE_NAMES.map((name) => (
              <li key={name} className="rounded-full border border-border bg-background px-3 py-1 text-foreground">
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-3 rounded-3xl border border-border bg-card p-5 text-sm">
          <p className="font-sans text-base font-bold">{t.prices}</p>
          <p className="mt-2 text-muted-foreground">
            {t.pricesText(packs)}{" "}
            <Link to="/prezzi" className="font-semibold text-primary underline">
              {t.details}
            </Link>
          </p>
        </section>

        <p className="mt-auto pt-14 text-sm text-muted-foreground">{t.account}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t.contact}:{" "}
          <a href="mailto:admin@traduchat.com" className="font-semibold text-primary underline">
            admin@traduchat.com
          </a>
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 pb-4 text-sm text-muted-foreground">
          <Link to="/prezzi" className="hover:text-primary">{t.prices}</Link>
          <Link to="/termini" className="hover:text-primary">{t.terms}</Link>
          <Link to="/rimborsi" className="hover:text-primary">{t.refunds}</Link>
          <Link to="/privacy" className="hover:text-primary">{t.privacy}</Link>
          <Link to="/cookie" className="hover:text-primary">Cookie</Link>
        </p>
      </main>
    </div>
  );
}
