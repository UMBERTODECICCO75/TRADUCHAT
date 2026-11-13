/** Only transport failures should be retried automatically. */
export function chatSendFailure(error: unknown): { retryable: boolean; message: string } {
  const message = error instanceof Error ? error.message : "";
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  if (/crediti esauriti/i.test(message)) return { retryable: false, message };
  if (status === 401 || /unauthorized|sessione|jwt|token.*expired/i.test(message)) {
    return { retryable: false, message: "Sessione scaduta: esci e accedi di nuovo. Il messaggio non è stato inviato." };
  }
  if (/lingue|invito|non trovata|troppi|limite|non autorizzat|invalid|obbligatori/i.test(message) || (status >= 400 && status < 500)) {
    return { retryable: false, message: message || "Messaggio non inviato: controlla l’accesso alla conversazione." };
  }
  return { retryable: true, message: "Connessione interrotta: riprova l’invio. Il messaggio è conservato su questo dispositivo." };
}