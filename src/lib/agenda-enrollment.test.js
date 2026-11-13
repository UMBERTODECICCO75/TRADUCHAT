import { expect, mock, test } from "bun:test";

mock.module("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: handler => handler,
    };
    return builder;
  },
}));
mock.module("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

const { scheduleAgendaEmail } = await import("./agenda.functions");
const data = { id: "f66be19d-8c7f-4b05-bcfe-51e040540dac", text: "Promemoria", remindAt: "2099-10-18T20:00:00Z" };

function contextFor(user) {
  const inserted = [];
  return {
    inserted,
    context: {
      userId: "own-user",
      supabase: {
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        from: () => ({ insert: async row => { inserted.push(row); return { error: null }; } }),
      },
    },
  };
}

test("email reminders never enable SMS or telephone calls", async () => {
  const { context, inserted } = contextFor(null);
  await scheduleAgendaEmail({ data: { ...data, email: true }, context });
  expect(inserted[0].send_call).toBe(false);
  expect(inserted[0].send_sms).toBe(false);
  expect(inserted[0].send_email).toBe(true);
  expect(inserted[0].user_id).toBe("own-user");
});

test("legacy telephone opt-in is rejected even with a verified number", async () => {
  const { context, inserted } = contextFor({ phone: "+393331234567", phone_confirmed_at: "2026-10-18" });
  await expect(scheduleAgendaEmail({ data: { ...data, call: true }, context })).rejects.toThrow("avvisi telefonici Da ricordare sono stati rimossi");
  expect(inserted).toHaveLength(0);
});
