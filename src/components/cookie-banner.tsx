import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { needsAnswer, onConsentChange, readChoice, saveChoices, type Purpose } from "@/lib/consent";

const PURPOSES: Purpose[] = ["analytics", "advertising"];
const OPEN_EVENT = "open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieSettingsLink({ className = "underline" }: { className?: string }) {
  return <button type="button" className={className} onClick={openCookieSettings}>Cookie</button>;
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [sw, setSw] = useState<Record<Purpose, boolean>>({ analytics: false, advertising: false });
  const [gpc, setGpc] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => setSw({ analytics: readChoice("analytics") === "granted", advertising: readChoice("advertising") === "granted" });

  useEffect(() => {
    setGpc((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
    void needsAnswer(PURPOSES).then((n) => n && setOpen(true));
    const show = () => { load(); setSettings(true); setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    const off = onConsentChange(load);
    return () => { window.removeEventListener(OPEN_EVENT, show); off(); };
  }, []);

  useEffect(() => { if (open) ref.current?.focus(); }, [open, settings]);

  if (!open) return null;
  const all = (c: "granted" | "denied") => { saveChoices({ analytics: c, advertising: c }); setOpen(false); setSettings(false); };
  const save = () => {
    saveChoices({ analytics: sw.analytics ? "granted" : "denied", advertising: sw.advertising ? "granted" : "denied" });
    setOpen(false); setSettings(false);
  };
  const row = (p: Purpose, label: string) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" className="h-4 w-4 accent-primary" disabled={gpc} checked={!gpc && sw[p]} onChange={(e) => setSw((s) => ({ ...s, [p]: e.target.checked }))} />
    </label>
  );

  return (
    <div ref={ref} tabIndex={-1} role="region" aria-label="Preferenze cookie" className="fixed inset-x-3 bottom-8 z-[60] mx-auto max-w-md space-y-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none">
      <p className="text-sm">
        Usiamo cookie di analisi per misurare le visite e, solo con il tuo consenso, cookie pubblicitari per misurare le campagne. Dettagli nell'<a href="/privacy" className="font-semibold underline">Informativa Privacy</a>.
      </p>
      {settings && (
        <div className="space-y-2 rounded-xl bg-muted p-3 text-muted-foreground">
          {gpc && <p className="text-xs">Il segnale di privacy del tuo browser è attivo: i cookie facoltativi restano disattivati.</p>}
          <div className="flex items-center justify-between text-sm"><span>Necessari</span><span className="text-xs">Sempre attivi</span></div>
          {row("analytics", "Analisi, fornita da Lovable")}
          {row("advertising", "Pubblicità, fornita dai partner pubblicitari")}
          <Button size="sm" className="w-full" onClick={save}>Salva preferenze</Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => all("denied")}>Rifiuta tutti</Button>
        <Button variant="outline" onClick={() => all("granted")}>Accetta tutti</Button>
      </div>
      {!settings && <button type="button" className="w-full text-xs underline" onClick={() => { load(); setSettings(true); }}>Impostazioni cookie</button>}
    </div>
  );
}
