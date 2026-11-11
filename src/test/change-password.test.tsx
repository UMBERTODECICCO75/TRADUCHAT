import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePassword } from "@/components/change-password";
const { auth } = vi.hoisted(() => ({ auth: { getUser: vi.fn(), resetPasswordForEmail: vi.fn(), verifyOtp: vi.fn(), updateUser: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { email: "owner@example.com" } }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});
async function form() {
  render(<ChangePassword />);
  fireEvent.click(screen.getByRole("button", { name: "Invia codice via email" }));
  await screen.findByLabelText("Codice ricevuto");
  fireEvent.change(screen.getByLabelText("Codice ricevuto"), { target: { value: "123456" } });
  fireEvent.change(screen.getByLabelText("Nuova password"), { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Conferma nuova password"), { target: { value: "new-password" } });
}
describe("Email password change", () => {
  it("sends to the authenticated email and verifies recovery before updating", async () => {
    await form();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("owner@example.com", { redirectTo: `${window.location.origin}/reset-password` });
    fireEvent.click(screen.getByRole("button", { name: "Salva nuova password" }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" }));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "owner@example.com", token: "123456", type: "recovery" });
    const verifiedAt = auth.verifyOtp.mock.invocationCallOrder[0];
    const updatedAt = auth.updateUser.mock.invocationCallOrder[0];
    if (verifiedAt === undefined || updatedAt === undefined) throw new Error("Missing auth calls");
    expect(verifiedAt).toBeLessThan(updatedAt);
  });
  it("never changes the password when the code is invalid", async () => {
    auth.verifyOtp.mockResolvedValue({ error: new Error("expired") });
    await form();
    fireEvent.click(screen.getByRole("button", { name: "Salva nuova password" }));
    await screen.findByRole("alert");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("rejects mismatched passwords before verifying the code", async () => {
    await form();
    fireEvent.change(screen.getByLabelText("Conferma nuova password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva nuova password" }));
    await screen.findByRole("alert");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});