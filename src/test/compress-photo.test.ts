import { beforeEach, describe, expect, it, vi } from "vitest";
import { compressPhoto } from "@/lib/compress-photo";

const compress = vi.hoisted(() => vi.fn());
vi.mock("browser-image-compression", () => ({ default: compress }));

describe("automatic photo compression", () => {
  beforeEach(() => { compress.mockReset(); });
  const original = () => new File([new Uint8Array(1000)], "photo.jpg", { type: "image/jpeg" });
  it("uploads the smaller result with the photo name and type", async () => {
    compress.mockResolvedValue(new Blob([new Uint8Array(100)], { type: "image/jpeg" }));
    const result = await compressPhoto(original(), "chat");
    expect(result.size).toBe(100);
    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
  });
  it("keeps the original if compression would increase its size", async () => {
    const file = original();
    compress.mockResolvedValue(new Blob([new Uint8Array(1200)]));
    expect(await compressPhoto(file, "chat")).toBe(file);
  });
  it("keeps the original when a device cannot compress it", async () => {
    const file = original();
    compress.mockImplementation(() => { throw new Error("decode failed"); });
    expect(await compressPhoto(file, "profile")).toBe(file);
  });
  it("preserves GIF animation without recompression", async () => {
    const file = new File(["gif"], "motion.gif", { type: "image/gif" });
    expect(await compressPhoto(file, "chat")).toBe(file);
    expect(compress).not.toHaveBeenCalled();
  });
  it("preserves PNG transparency by keeping PNG output", async () => {
    const file = new File([new Uint8Array(1000)], "transparent.png", { type: "image/png" });
    compress.mockResolvedValue(new Blob([new Uint8Array(100)], { type: "image/png" }));
    const result = await compressPhoto(file, "profile");
    expect(result.type).toBe("image/png");
    expect(compress.mock.calls[0]?.[1].fileType).toBe("image/png");
  });
});