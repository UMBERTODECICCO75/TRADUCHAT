import { expect, test } from "bun:test";
import { AssistantImage, assistantReservationQuestion } from "./assistant-images";
const png = { name: "screenshot.png", dataUrl: `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\nfixture")}` };
test("accetta PNG inline e rifiuta URL remoti e contenuti camuffati", () => {
  expect(AssistantImage.safeParse(png).success).toBe(true);
  expect(AssistantImage.safeParse({ ...png, dataUrl: "https://example.com/photo.png" }).success).toBe(false);
  expect(AssistantImage.safeParse({ ...png, dataUrl: `data:image/png;base64,${btoa("<script>test</script>")}` }).success).toBe(false);
  expect(AssistantImage.safeParse({ ...png, dataUrl: "data:image/svg+xml;base64,PHN2Zy8+" }).success).toBe(false);
});
test("rifiuta immagine sopra il limite e base64 malformato", () => {
  expect(AssistantImage.safeParse({ ...png, dataUrl: `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\n" + "a".repeat(2 * 1024 * 1024))}` }).success).toBe(false);
  expect(AssistantImage.safeParse({ ...png, dataUrl: "data:image/png;base64,AAAAA" }).success).toBe(false);
});
test("prenotazione idempotente legata alla foto senza conservarne i dati", async () => {
  const key = await assistantReservationQuestion("Leggi", png);
  expect(key).toBe(await assistantReservationQuestion("Leggi", { ...png, name: "rinominata.png" }));
  expect(key).not.toBe(await assistantReservationQuestion("Leggi", { ...png, dataUrl: png.dataUrl + "AAAA" }));
  expect(key).not.toContain(png.dataUrl);
  expect(await assistantReservationQuestion("Leggi")).toBe("Leggi");
});