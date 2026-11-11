import { describe, it, expect } from "vitest";
import { photoError, visibleProfile, filterArchived } from "@/lib/profile-rules";
describe("profile menu rules", () => {
  it("hides status and online presence in incognito", () => { expect(visibleProfile("Disponibile", true)).toEqual({ status: "", online: false }); });
  it("shows status when incognito is off", () => { expect(visibleProfile("Disponibile", false)).toEqual({ status: "Disponibile", online: true }); });
  it("keeps archived conversations out of recent chats", () => { expect(filterArchived([{ name: "Milly" }, { name: "Sara" }], ["Milly"])).toEqual([{ name: "Sara" }]); });
  it("restores archived conversations", () => { expect(filterArchived([{ name: "Milly" }], [])).toEqual([{ name: "Milly" }]); });
  it("rejects photos over 25 MB", () => { expect(photoError({ size: 25 * 1024 * 1024 + 1, type: "image/jpeg" })).not.toBe(""); });
  it("rejects non-image uploads", () => { expect(photoError({ size: 10, type: "text/html" })).not.toBe(""); });
  it("accepts photos up to 25 MB", () => { expect(photoError({ size: 25 * 1024 * 1024, type: "image/png" })).toBe(""); });
});