import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const KEY = "traduchat:cookie-consent";

export type CookieConsent = "accepted" | "rejected";

export function readCookieConsent(): CookieConsent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readCookieConsent()) setVisible(true);
  }, []);

  function choose(value: CookieConsent) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* storage non disponibile */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-4 shadow-lg sm:p-5">
        <p className="text-sm font-bold text-foreground">Cookie e privacy</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Usiamo memoria del browser per accesso e preferenze. Il sito pubblicato include anche
          statistiche di Lovable: la scelta qui salvata non risulta ancora collegata agli strumenti
          dell'hosting. Nella Cookie policy trovi nomi, durate e dettagli; non risultano tag Google Ads attivi.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="rounded-full sm:flex-1" onClick={() => choose("accepted")}>
            Accetta tutto
          </Button>
          <Button
            variant="secondary"
            className="rounded-full sm:flex-1"
            onClick={() => choose("rejected")}
          >
            Solo necessari
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Leggi la{" "}
          <Link to="/privacy" className="font-semibold text-primary underline">
            Privacy e GDPR
          </Link>{" "}
          e la{" "}
          <Link to="/cookie" className="font-semibold text-primary underline">
            Cookie policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
