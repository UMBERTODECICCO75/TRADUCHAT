import { describe, expect, it } from "vitest";
import { chatPhotoError } from "@/lib/chat-photos";

describe("chat photo rules", () => {
  it("accepts images up to 25 MB", () => { expect(chatPhotoError({ size: 25 * 1024 * 1024, type: "image/jpeg" })).toBe(""); });
  it("rejects images over 25 MB", () => { expect(chatPhotoError({ size: 25 * 1024 * 1024 + 1, type: "image/png" })).not.toBe(""); });
  it("rejects non-images", () => { expect(chatPhotoError({ size: 10, type: "application/pdf" })).not.toBe(""); });
});
