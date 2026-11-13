import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { connectWithUser } from "@/lib/rooms.functions";
import { POST_AUTH_KEY } from "@/lib/post-auth";

export const Route = createFileRoute("/connetti/$userId")({
  head: () => ({
    meta: [
      { title: "Connettiti su TraduChat" },
      {
        name: "description",
        content: "Apri la conversazione tradotta in tempo reale con chi ti ha mostrato il QR code.",
      },
      { property: "og:title", content: "Connettiti su TraduChat" },
      {
        property: "og:description",
        content: "Apri la conversazione tradotta in tempo reale con chi ti ha mostrato il QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectPage,
});

/** Landing page of a personal QR: signs in if needed, then opens the direct chat. */
function ConnectPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const connect = useServerFn(connectWithUser);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        sessionStorage.setItem(POST_AUTH_KEY, `/connetti/${userId}`);
        void navigate({ to: "/auth", replace: true });
        return;
      }
      try {
        const result = await connect({ data: { userId } });
        if (!active) return;
        if (result.pending || !result.code) {
          setPending(true);
          return;
        }
        void navigate({ to: "/stanza/$code", params: { code: result.code }, replace: true });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Non riesco ad aprire la conversazione.");
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, connect, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      {error ? (
        <>
          <p className="text-lg font-semibold">Qualcosa non ha funzionato</p>
          <p className="text-muted-foreground">{error}</p>
        </>
      ) : pending ? (
        <>
          <p className="text-lg font-semibold">Richiesta inviata ✨</p>
          <p className="text-muted-foreground">
            La conversazione si apre quando l'altra persona accetta il tuo invito: lo trova nella
            sua schermata iniziale.
          </p>
        </>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-lg font-semibold">Apro la conversazione…</p>
          <p className="text-muted-foreground">Un attimo e sei in chat.</p>
        </>
      )}
    </main>
  );
}
