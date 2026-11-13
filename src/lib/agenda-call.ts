export function confirmedReminderPhone(user: { phone?: string; phone_confirmed_at?: string; email?: string; email_confirmed_at?: string }): string | null {
  if (user.phone_confirmed_at && /^\+\d{8,15}$/.test(user.phone ?? "")) return user.phone ?? null;
  const match = user.email_confirmed_at ? /^(\d{8,15})@telefono\.traduchat\.app$/.exec(user.email ?? "") : null;
  return match ? `+${match[1]}` : null;
}

export function agendaCallForm(to: string, from: string, text: string): URLSearchParams {
  if (!/^\+\d{8,15}$/.test(to) || !/^\+\d{8,15}$/.test(from)) throw new Error("Numero non valido.");
  const escaped = text.slice(0, 500).replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
    return entities[character] ?? character;
  });
  return new URLSearchParams({ To: to, From: from, Twiml: `<Response><Say language="it-IT">${escaped}</Say><Hangup/></Response>`, Timeout: "20" });
}