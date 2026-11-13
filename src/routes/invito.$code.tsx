import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { POST_AUTH_KEY } from "@/lib/post-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invito/$code")({
  head: () => ({
    meta: [
      { title: "Sei stato invitato in una chat — TraduChat" },
      { name: "description", content: "Apri l'invito: scrivi nella tua lingua, TraduChat traduce all'istante." },
      { property: "og:title", content: "Ti hanno invitato a una chat tradotta — TraduChat" },
      { property: "og:description", content: "Scrivi nella tua lingua e l'altra persona legge nella sua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitePage,
});

/** Public invite link: logged-in users enter the chat; others create an account and come back here. */
function InvitePage() {
  const { code } = Route.useParams();
  const clean = code.trim().toUpperCase();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) void navigate({ to: "/stanza/$code", params: { code: clean }, replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [clean, navigate]);

  function start() {
    sessionStorage.setItem(POST_AUTH_KEY, `/stanza/${clean}`);
    void navigate({ to: "/auth" });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      {checking ? (
        <Loader2 className="size-8 animate-spin text-primary" />
      ) : (
        <>
          <MessageCircle className="size-10 text-primary" />
          <h1 className="text-2xl font-extrabold">Ti hanno invitato in una chat</h1>
          <p className="max-w-sm text-muted-foreground">
            Scrivi nella tua lingua: l'altra persona legge nella sua, all'istante. Crea il tuo
            account gratuito in pochi secondi e la chat si apre subito.
          </p>
          <p className="font-display text-xl tracking-[0.3em]">{clean}</p>
          <Button size="lg" className="rounded-full px-8" onClick={start}>
            Entra nella chat
          </Button>
        </>
      )}
    </main>
  );
}
