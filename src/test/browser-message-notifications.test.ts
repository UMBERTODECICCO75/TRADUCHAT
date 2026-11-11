import { afterEach, describe, expect, it, vi } from "vitest";
import { requestMessageNotices, shouldShowMessageNotice, showMessageNotice } from "@/lib/browser-message-notifications";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Background browser notices", () => {
  it("shows a notice only in background with Bip On and permission", () => {
    expect(shouldShowMessageNotice(true, "hidden", "granted")).toBe(true);
    expect(shouldShowMessageNotice(true, "visible", "granted")).toBe(false);
    expect(shouldShowMessageNotice(false, "hidden", "granted")).toBe(false);
    expect(shouldShowMessageNotice(true, "hidden", "denied")).toBe(false);
  });
  it("requests browser permission when activated", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    expect(await requestMessageNotices()).toBe("granted");
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
  it("does not repeatedly prompt after denial", async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "denied", requestPermission });
    expect(await requestMessageNotices()).toBe("denied");
    expect(requestPermission).not.toHaveBeenCalled();
  });
  it("suppresses notices when Bip is Off", async () => {
    const notice = vi.fn();
    vi.stubGlobal("Notification", notice);
    expect(await showMessageNotice(() => false)).toBeUndefined();
    expect(notice).not.toHaveBeenCalled();
  });
  it("does not include private message text in browser notices", async () => {
    const notice = vi.fn(function() { return { close: vi.fn() }; });
    vi.stubGlobal("Notification", notice);
    await showMessageNotice(() => true);
    expect(notice).toHaveBeenCalledWith("TraduChat", expect.objectContaining({ body: "Hai ricevuto un nuovo messaggio.", silent: true }));
  });
});