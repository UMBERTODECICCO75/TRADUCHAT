import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getNewsletterConsent, saveNewsletterConsent } from "@/lib/newsletter.functions";

export function NewsletterConsent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryNotification, setRetryNotification] = useState(false);
  const [message, setMessage] = useState("");
  const getConsent = useServerFn(getNewsletterConsent);
  const saveConsent = useServerFn(saveNewsletterConsent);
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null); setAuthReady(true);
      setChecked(false); setMessage(""); setRetryNotification(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  const consent = useQuery({ queryKey: ["newsletter-consent", userId], queryFn: () => getConsent(), enabled: Boolean(userId), retry: false });
  async function submit(accepted: boolean) {
    if (accepted && !checked && !retryNotification) return;
    setBusy(true); setMessage("");
    try {
      const result = await saveConsent({ data: { accepted } });
      queryClient.setQueryData(["newsletter-consent", userId], { accepted: result.accepted });
      setChecked(false);
      setRetryNotification(result.notification === "failed");
      setMessage(!result.accepted ? "Consenso revocato."
        : result.notification === "sent" ? "Consenso salvato. Avviso inviato a admin@traduchat.com."
        : result.notification === "suppressed" ? "Consenso salvato. L’indirizzo del gestore non può ricevere l’avviso email."
        : "Consenso salvato, ma l’avviso al gestore non è stato inviato. Puoi riprovare.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operazione non riuscita. Riprova."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3 border-t border-border pt-4" translate="yes">
    {!authReady ? <Loader2 aria-label="Caricamento consenso" className="size-4 animate-spin" />
      : !userId ? <Button asChild variant="outline"><Link to="/auth"><Mail className="size-4" />Accedi per scegliere il consenso</Link></Button>
      : consent.isPending ? <Loader2 aria-label="Caricamento consenso" className="size-4 animate-spin" />
      : consent.isError ? <><p role="alert" className="text-sm text-destructive">Non riesco a leggere il consenso.</p><Button variant="outline" onClick={() => void consent.refetch()}>Riprova</Button></>
      : consent.data?.accepted ? <><p className="text-sm font-medium">Hai acconsentito agli aggiornamenti via email.</p>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => void submit(false)}>Revoca consenso</Button>
        {retryNotification && <Button disabled={busy} onClick={() => void submit(true)}><Mail className="size-4" />Riprova avviso al gestore</Button>}</div></>
      : <><label className="flex items-start gap-3 text-sm" htmlFor="newsletter-consent">
        <Checkbox id="newsletter-consent" checked={checked} disabled={busy} onCheckedChange={(value) => setChecked(value === true)} className="mt-1 shrink-0" />
        <span>Acconsento a ricevere via email da admin@traduchat.com comunicazioni sugli aggiornamenti e sulle nuove funzionalità di TraduChat. Il consenso è facoltativo e posso revocarlo in qualsiasi momento.</span>
        </label><Button disabled={!checked || busy} onClick={() => void submit(true)}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}Salva consenso</Button></>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}