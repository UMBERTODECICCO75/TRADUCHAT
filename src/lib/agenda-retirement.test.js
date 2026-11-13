import { expect, test } from "bun:test";

const { Route } = await import("../routes/api/public/hooks/agenda-reminders");

const handler = Route.options.server.handlers.POST;

test("reminder hook still refuses callers without a bearer token", async () => {
  const res = await handler({
    request: new Request("http://localhost/api/public/hooks/agenda-reminders", { method: "POST" }),
  });
  expect(res.status).toBe(401);
});

test("reminder hook sends no emails now that «Da ricordare» is removed", async () => {
  const res = await handler({
    request: new Request("http://localhost/api/public/hooks/agenda-reminders", {
      method: "POST",
      headers: { authorization: "Bearer test-token" },
    }),
  });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ sent: 0, retired: true });
});
