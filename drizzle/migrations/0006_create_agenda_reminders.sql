CREATE TABLE public.agenda_reminders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  remind_at timestamptz NOT NULL,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.agenda_reminders TO authenticated;
GRANT ALL ON public.agenda_reminders TO service_role;
ALTER TABLE public.agenda_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY agenda_select_own ON public.agenda_reminders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY agenda_insert_own ON public.agenda_reminders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY agenda_delete_own ON public.agenda_reminders FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX agenda_reminders_due ON public.agenda_reminders (remind_at) WHERE emailed_at IS NULL;