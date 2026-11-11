import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadContactAvatar } from "@/lib/contact-avatar";

const { rpc, signedUrl, from } = vi.hoisted(() => {
  const signedUrl = vi.fn();
  return { rpc: vi.fn(), signedUrl, from: vi.fn(() => ({ createSignedUrl: signedUrl })) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, storage: { from } } }));

describe("Contact profile photos", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads Mario Rossi's current profile photo rather than a fabricated portrait", async () => {
    rpc.mockResolvedValue({ data: "mario/current.jpg", error: null });
    signedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/photo" }, error: null });
    expect(await loadContactAvatar("Mario Rossi")).toBe("https://example.test/photo");
    expect(rpc).toHaveBeenCalledWith("contact_avatar", { profile_name: "Mario Rossi" });
    expect(signedUrl).toHaveBeenCalledWith("mario/current.jpg", 300);
  });
  it("keeps the initials fallback when no profile photo is available", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await loadContactAvatar("Mario Rossi")).toBe("");
    expect(from).not.toHaveBeenCalled();
  });
  it("does not request a private photo after access is denied", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Access denied" } });
    expect(await loadContactAvatar("Mario Rossi")).toBe("");
    expect(from).not.toHaveBeenCalled();
  });
});