import { describe, expect, it } from "vitest";
import { dueCallMinute } from "./usage-credits.server";
describe("videochiamata a consumo: 1 credito al minuto", () => {
  const start = "2026-10-24T10:00:00Z", t0 = Date.parse(start);
  it("il primo minuto si paga all'avvio", () => expect(dueCallMinute(start, t0)).toBe(1));
  it("59 secondi restano 1 minuto", () => expect(dueCallMinute(start, t0 + 59_000)).toBe(1));
  it("dopo 60 secondi si paga il secondo minuto", () => expect(dueCallMinute(start, t0 + 60_000)).toBe(2));
  it("10 minuti e mezzo costano 11 crediti", () => expect(dueCallMinute(start, t0 + 630_000)).toBe(11));
});
