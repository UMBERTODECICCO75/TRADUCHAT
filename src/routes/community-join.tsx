import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { joinCommunity } from "@/lib/community.functions";
import { POST_AUTH_KEY } from "@/lib/post-auth";

export const Route = createFileRoute("/community-join")({
  validateSearch: (search) => z.object({ code: z.string().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Entra nella community — TraduChat" },
      { name: "description", content: "Entra in una community TraduChat con traduzione automatica." },
      { property: "og:title", content: "Entra nella community — TraduChat" },
      { property: "og:description", content: "Scrivi nella tua lingua: TraduChat traduce per tutti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JoinPage,
});

/** Shared community link: signs in if needed, then joins and opens the community. */
function JoinPage() {
  const { code } = Route.useSearch();
  const navigate = useNavigate();
  const join = useServerFn(joinCommunity);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const clean = (code ?? "").trim().toUpperCase();
      if (clean.length < 4) {
        setError("Il link non contiene un codice valido.");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        sessionStorage.setItem(POST_AUTH_KEY, `/community-join?code=${clean}`);
        void navigate({ to: "/auth", replace: true });
        return;
      }
      try {
        const result = await join({ data: { code: clean } });
        if (active) void navigate({ to: "/stanza/$code", params: { code: result.code }, replace: true });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Non riesco a entrare nella community.");
      }
    })();
    return () => {
      active = false;
    };
  }, [code, join, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      {error ? (
        <>
          <p className="text-lg font-semibold">Qualcosa non ha funzionato</p>
          <p className="text-muted-foreground">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-lg font-semibold">Entro nella community…</p>
        </>
      )}
    </main>
  );
}
