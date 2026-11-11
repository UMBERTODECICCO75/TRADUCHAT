import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Home } from "@/routes/index";
import type { AccountMenu } from "@/lib/use-account-menu";

const startCall = vi.fn();
vi.mock('@/components/peer-calls', () => ({
  PeerCallsProvider: ({ children }: { children: React.ReactNode }) => children,
  usePeerCalls: () => ({
    people: [{ id: 'luca', name: 'Luca Rossi', role: 'TraduChat' }, { id: 'mara', name: 'Mara Giallo', role: 'TraduChat' }],
    history: [], userId: 'me', start: startCall,
  }),
}));

const account = {
  profile: null, notifications: [], archived: [], photo: "", error: "", loading: false,
  setPhoto: () => {}, save: async () => {}, archive: async () => {}, markRead: async () => {},
  beep: { enabled: false, toggle: () => {}, browserStatus: "idle" },
} satisfies AccountMenu;

const open = () => render(<Home account={account} openChat={() => {}} openProfile={() => {}} />);

describe("Home screen organisation", () => {
  it("opens the address book panel", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Apri contatti" }));
    expect(screen.getByRole("heading", { name: "Contatti" })).toBeTruthy();
    expect(screen.getByText("Luca Rossi")).toBeTruthy();
    expect(screen.getByText("Mara Giallo")).toBeTruthy();
  });

  it("opens the selected chat from the contacts panel", () => {
    const openChat = vi.fn();
    render(<Home account={account} openChat={openChat} openProfile={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Apri contatti" }));
    fireEvent.click(screen.getByRole("button", { name: "Scrivi a Mara Giallo" }));
    expect(openChat).toHaveBeenCalledWith("Mara Giallo");
  });

  it("opens a conversation from the contacts tab", () => {
    const openChat = vi.fn();
    render(<Home account={account} openChat={openChat} openProfile={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "contatti" }));
    fireEvent.click(screen.getByRole("button", { name: "Scrivi a Luca Rossi" }));
    expect(openChat).toHaveBeenCalledWith("Luca Rossi");
  });

  it.each([['Chiama', 'audio'], ['Videochiamata', 'video']])("starts %s with the selected registered user", (action, mode) => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "contatti" }));
    fireEvent.click(screen.getByRole("button", { name: `${action} Luca Rossi` }));
    expect(startCall).toHaveBeenCalledWith('Luca Rossi', mode);
  });
});
