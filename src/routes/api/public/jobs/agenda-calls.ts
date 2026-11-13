import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Retained to safely reject any late callbacks after retiring the schedule.
export const Route = createFileRoute("/api/public/jobs/agenda-calls")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        return Response.json({ error: "Avvisi telefonici Da ricordare rimossi." }, { status: 410 });
      },
    },
  },
});
