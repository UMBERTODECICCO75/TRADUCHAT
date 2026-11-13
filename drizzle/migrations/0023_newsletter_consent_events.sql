CREATE TABLE public.newsletter_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  accepted boolean NOT NULL,
  consent_version text NOT NULL DEFAULT '2026-10-25',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
GRANT SELECT ON public.newsletter_consent_events TO authenticated;
GRANT ALL ON public.newsletter_consent_events TO service_role;
ALTER TABLE public.newsletter_consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY newsletter_consent_owner_read ON public.newsletter_consent_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX newsletter_consent_latest ON public.newsletter_consent_events(user_id, created_at DESC);
CREATE FUNCTION public.set_newsletter_consent(p_accepted boolean)
RETURNS public.newsletter_consent_events
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  account_id uuid := auth.uid();
  account_email text;
  previous public.newsletter_consent_events;
  result public.newsletter_consent_events;
BEGIN
  IF account_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(account_id::text || ':newsletter', 0));
  SELECT * INTO previous FROM public.newsletter_consent_events WHERE user_id = account_id ORDER BY created_at DESC LIMIT 1;
  IF previous.id IS NOT NULL AND previous.accepted = p_accepted THEN RETURN previous; END IF;
  SELECT email INTO account_email FROM auth.users WHERE id = account_id AND email_confirmed_at IS NOT NULL;
  IF p_accepted AND (account_email IS NULL OR account_email LIKE '%@phone.traduchat.internal') THEN RAISE EXCEPTION 'Verified email required'; END IF;
  IF NOT p_accepted AND previous.id IS NULL THEN RAISE EXCEPTION 'No consent to revoke'; END IF;
  INSERT INTO public.newsletter_consent_events (user_id,email,accepted)
  VALUES (account_id,CASE WHEN p_accepted THEN account_email ELSE previous.email END,p_accepted) RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_newsletter_consent(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_newsletter_consent(boolean) TO authenticated;