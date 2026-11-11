import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountMenu } from "@/lib/use-account-menu";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

function results(profile: { id: string; username: string } | null) {
  from.mockImplementation((table: string) => {
    const result = { data: table === "profiles" ? profile : [], error: null };
    const query = {
      select: vi.fn(() => query), eq: vi.fn(() => query),
      order: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: Promise.resolve(result).then.bind(Promise.resolve(result)),
    };
    return query;
  });
}

describe("Account identity changes", () => {
  beforeEach(() => { from.mockReset(); });

  it("does not request private data while signed out and loads it after sign-in", async () => {
    results({ id: "user-one", username: "Mario" });
    const { result, rerender } = renderHook(({ id }) => useAccountMenu(id), { initialProps: { id: null as string | null } });
    expect(from).not.toHaveBeenCalled();
    expect(result.current.error).toBe("");
    rerender({ id: "user-one" });
    await waitFor(() => expect(result.current.profile?.username).toBe("Mario"));
  });

  it("clears profile and photo on sign-out and loads the next account", async () => {
    results({ id: "user-one", username: "Mario" });
    const { result, rerender } = renderHook(({ id }) => useAccountMenu(id), { initialProps: { id: "user-one" as string | null } });
    await waitFor(() => expect(result.current.profile?.id).toBe("user-one"));
    act(() => result.current.setPhoto("old-photo"));
    rerender({ id: null });
    expect(result.current.profile).toBeNull();
    expect(result.current.photo).toBe("");
    expect(result.current.notifications).toEqual([]);
    expect(result.current.archived).toEqual([]);
    expect(result.current.error).toBe("");
    results({ id: "user-two", username: "Umberto" });
    rerender({ id: "user-two" });
    await waitFor(() => expect(result.current.profile?.username).toBe("Umberto"));
  });
});