import { describe, expect, it } from "vitest";
import { cameraDelivery, validateCameraInput, validateCameraResult } from "@/lib/camera-rules";

describe("camera translation", () => {
  it("uses the selected personal language", () => {
    expect(validateCameraInput({ image: "data:image/jpeg;base64,YQ==", target: "Italiano" }).target).toBe("Italiano");
  });
  it("keeps menu text, prices and translated text", () => {
    expect(validateCameraResult({ original: "Coffee €2", translation: "Caffè €2" })).toEqual({ original: "Coffee €2", translation: "Caffè €2" });
  });
  it("does not send unreadable photos", () => {
    expect(() => validateCameraResult({ original: "", translation: "" })).toThrow();
  });
  it("addresses the translation to the chosen contact", () => {
    expect(cameraDelivery("mario", "umberto", { original: "Exit", translation: "Uscita" }, "Italiano")).toEqual({ sender_id: "umberto", recipient_id: "mario", original_text: "Exit", translated_text: "Uscita", target_language: "Italiano" });
  });
  it("prevents sending to yourself", () => {
    expect(() => cameraDelivery("umberto", "umberto", { original: "Exit", translation: "Uscita" }, "Italiano")).toThrow();
  });
  it("rejects non-photo content", () => {
    expect(() => validateCameraInput({ image: "data:text/html;base64,YQ==", target: "Italiano" })).toThrow();
  });
});