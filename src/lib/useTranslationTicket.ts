import { useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getTranslationTicket } from "./translate.functions";

/** Keeps a fresh signed ticket that the translation endpoint requires. */
export function useTranslationTicket() {
  const issue = useServerFn(getTranslationTicket);
  const issueRef = useRef(issue);
  issueRef.current = issue;
  const ticket = useRef<{ value: string; expiresAt: number } | null>(null);
  const inflight = useRef<Promise<string> | null>(null);

  const ensureTicket = useCallback(async () => {
    const current = ticket.current;
    if (current && current.expiresAt > Date.now() + 30_000) return current.value;
    if (inflight.current) return inflight.current;

    inflight.current = issueRef.current({ data: undefined })
      .then((result) => {
        if (!result.ticket) throw new Error("error" in result ? result.error : "Traduzione non disponibile, riprova più tardi.");
        ticket.current = {
          value: result.ticket,
          expiresAt: Date.now() + result.expiresIn,
        };
        return result.ticket;
      })
      .finally(() => {
        inflight.current = null;
      });

    return inflight.current;
  }, []);

  return ensureTicket;
}
