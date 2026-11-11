import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nuova password — Traduchat" },
      { name: "description", content: "Imposta una nuova password per il tuo account Traduchat." },
      { property: "og:title", content: "Nuova password — Traduchat" },
      { property: "og:description", content: "Imposta una nuova password per il tuo account Traduchat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg("Link scaduto o non valido, richiedine uno nuovo.");
    navigate({ to: "/", replace: true });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-dark p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-8">
        <h1 className="text-center font-display text-3xl font-black text-primary">TRADUCHAT</h1>
        <p className="text-center text-sm text-muted-foreground">Scegli una nuova password</p>
        <input type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nuova password"
          className="w-full rounded-full border border-input px-5 py-3.5 outline-none focus:ring-2 focus:ring-ring" />
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button className="w-full rounded-full bg-primary py-4 font-display font-extrabold text-primary-foreground">SALVA →</button>
      </form>
    </div>
  );
}
