import { expect, test } from "bun:test";
import { agendaWhatsAppUrl } from "./agenda-whatsapp";

test("manual sharing opens WhatsApp with the complete reminder and no fixed recipient", () => {
  const url = new URL(agendaWhatsAppUrl({ text: "Spesa & medicine", date: "2026-10-19", time: "09:30" }));
  expect(url.origin).toBe("https://wa.me");
  expect(url.pathname).toBe("/");
  expect(url.searchParams.get("text")).toBe("TraduChat — Da ricordare\n19/10/2026 alle 09:30\nSpesa & medicine");
});