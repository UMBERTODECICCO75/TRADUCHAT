import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy email scheduler. The «Da ricordare» section was removed from the app,
 * so this endpoint no longer delivers anything: reminders already stored are
 * never sent by email anymore.
 */
export const Route = createFileRoute("/api/public/hooks/agenda-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("authorization")?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json({ sent: 0, retired: true });
      },
    },
  },
});
