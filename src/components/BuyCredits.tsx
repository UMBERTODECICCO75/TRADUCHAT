import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { createCreditCheckout } from "@/lib/payments.functions";
import { CREDIT_PACKS, formatCreditPrice, isBillingEmail } from "@/lib/credit-catalog";
import { initializePaddle } from "@/lib/paddle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PriceId = (typeof CREDIT_PACKS)[number]["priceId"];

/** Recharge button: the three credit packs are hidden until the user taps it. */
export function BuyCredits() {
  const checkout = useServerFn(createCreditCheckout);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<PriceId | null>(null);
  const [error, setError] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");

  async function buy(priceId: PriceId) {
    setBusy(priceId); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Accedi per ricaricare i crediti.");
      const missingEmail = !isBillingEmail(user.email);
      if (missingEmail && !isBillingEmail(billingEmail.trim())) {
        setNeedsEmail(true);
        throw new Error("Inserisci un'email reale per ricevere la ricevuta.");
      }
      await initializePaddle();
      const order = await checkout({ data: { priceId, billingEmail: missingEmail ? billingEmail.trim() : undefined } });
      // The payment window needs the keyboard: close this dialog before it opens.
      setOpen(false);
      window.Paddle.Checkout.open({
        transactionId: order.transactionId,
        customer: { email: order.email },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/ricariche?checkout=success&order=${order.orderId}`,
          locale: "it",
          allowLogout: false,
          variant: "one-page",
        },
      });
      toast("Pagamento aperto: se lo chiudi senza pagare, nessun credito viene aggiunto.");
      void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pagamento non riuscito, riprova.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button className="mt-3 w-full sm:w-auto" onClick={() => { setError(""); setOpen(true); }}>
        <Coins className="size-4" /> Ricarica crediti
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Coins className="size-5 text-primary" /> Ricarica crediti
          </DialogTitle>
          <DialogDescription>
            Pagamento unico, nessun abbonamento. I crediti non scadono.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <Button key={pack.priceId} variant="outline" className="h-auto flex-col gap-1 py-3" disabled={busy !== null} onClick={() => void buy(pack.priceId)}>
              {busy === pack.priceId ? <Loader2 className="size-4 animate-spin" /> : <span className="text-xl font-extrabold text-foreground">{pack.credits}</span>}
              <span className="text-xs text-muted-foreground">crediti</span>
              <span className="font-bold text-primary">{formatCreditPrice(pack.amount)}</span>
            </Button>
          ))}
        </div>
        {needsEmail && <Input className="mt-1" type="email" aria-label="Email per la ricevuta" placeholder="Email per la ricevuta" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />}
        {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
