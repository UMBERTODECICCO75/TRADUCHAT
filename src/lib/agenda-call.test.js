import { expect, test } from "bun:test";
import { agendaCallForm, confirmedReminderPhone } from "./agenda-call";

test("a reminder telephone call reads Italian text and never creates an SMS body", () => {
  const form = agendaCallForm("+393331234567", "+13344873546", "TraduChat. Da ricordare. Medico & visita <oggi>");
  expect(form.get("To")).toBe("+393331234567");
  expect(form.has("Body")).toBe(false);
  expect(form.get("Twiml")).toBe('<Response><Say language="it-IT">TraduChat. Da ricordare. Medico &amp; visita &lt;oggi&gt;</Say><Hangup/></Response>');
});

test("only verified Auth identities may receive a reminder call", () => {
  expect(confirmedReminderPhone({ phone: "+393331234567" })).toBe(null);
  expect(confirmedReminderPhone({ phone: "+393331234567", phone_confirmed_at: "2026-10-18" })).toBe("+393331234567");
  expect(confirmedReminderPhone({ email: "393331234567@telefono.traduchat.app", email_confirmed_at: "2026-10-18" })).toBe("+393331234567");
  expect(confirmedReminderPhone({ email: "393331234567@telefono.traduchat.app" })).toBe(null);
});