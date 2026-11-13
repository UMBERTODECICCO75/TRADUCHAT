CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  device_type text NOT NULL,
  device_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_sessions TO authenticated;
GRANT ALL ON public.device_sessions TO service_role;

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages device sessions"
  ON public.device_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX device_sessions_user_idx ON public.device_sessions (user_id, last_seen_at DESC);