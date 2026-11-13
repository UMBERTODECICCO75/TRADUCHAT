import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins } from "lucide-react";

import { getAiCreditBalance } from "@/lib/payments.functions";

/** Translation credit balance with a recharge link (1 credit per translated message, 1 per call minute). */
export function CreditBalanceBar() {
  const readBalance = useServerFn(getAiCreditBalance);
  const { data, isError } = useQuery({ queryKey: ["credit-balance"], queryFn: () => readBalance(), refetchInterval: 60_000 });
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
      <Coins className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        <span className="font-semibold text-foreground">
          {isError ? "Saldo non disponibile" : data ? `${data.balance} crediti` : "…"}
        </span>{" "}
        · 1 per messaggio o vocale tradotto, 1 al minuto in videochiamata
      </p>
      <Link to="/ricariche" className="shrink-0 font-semibold text-primary underline">Ricarica</Link>
    </div>
  );
}
