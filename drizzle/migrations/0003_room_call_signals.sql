CREATE TABLE public.room_call_signals (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 call_id uuid NOT NULL,
 room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('invite','offer','answer','ice','hangup','decline','caption')),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.room_call_signals TO service_role;
ALTER TABLE public.room_call_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX room_call_signals_recipient_idx ON public.room_call_signals (recipient_id, room_id, id DESC);
CREATE INDEX room_call_signals_created_idx ON public.room_call_signals (created_at);