import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const SOURCE = readFileSync(new URL("../routes/cookie.tsx", import.meta.url), "utf8");

function flatStrings() {
  const start = SOURCE.indexOf("const FLAT");
  const open = SOURCE.indexOf("[", start);
  const close = SOURCE.indexOf("\n];", open);
  const body = SOURCE.slice(open + 1, close);
  return [...body.matchAll(/^\s*"((?:[^"\\]|\\.)*)",\s*$/gm)].map((m) => m[1]);
}

function usedIndexes() {
  return [...SOURCE.matchAll(/texts\[(\d+)\]/g)].map((m) => Number(m[1]));
}

describe("cookie policy page", () => {
  const strings = flatStrings();
  const used = usedIndexes();

  test("every text slot is rendered", () => {
    const missing = strings.map((_, i) => i).filter((i) => !used.includes(i));
    expect(missing).toEqual([]);
  });

  test("no rendered slot is missing from the list", () => {
    expect(used.filter((i) => i < 0 || i >= strings.length)).toEqual([]);
  });

  test("voice note note follows its own label", () => {
    const label = strings.indexOf("Messaggi vocali");
    expect(label).toBeGreaterThan(-1);
    expect(strings[label + 1]).toMatch(/^le registrazioni audio/);
    expect(SOURCE).toContain(
      '<strong className="text-foreground">{texts[' + label + ']}:</strong> {texts[' + (label + 1) + "]}",
    );
  });

  test("choice heading stands on its own line", () => {
    const heading = strings.indexOf("Cambia la tua scelta");
    expect(heading).toBeGreaterThan(-1);
    expect(SOURCE).toContain('font-bold text-foreground">{texts[' + heading + "]}</h2>");
  });

  test("buttons keep their own labels", () => {
    const accept = strings.indexOf("Accetta tutto");
    const reject = strings.indexOf("Solo necessari");
    expect(accept).toBeGreaterThan(-1);
    expect(reject).toBeGreaterThan(-1);
    expect(SOURCE).toContain("{texts[" + accept + "]}");
    expect(SOURCE).toContain("{texts[" + reject + "]}");
  });
});
