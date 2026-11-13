CREATE POLICY agenda_reminders_deny_anonymous ON public.agenda_reminders
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);