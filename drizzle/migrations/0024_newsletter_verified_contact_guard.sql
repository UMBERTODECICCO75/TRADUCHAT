CREATE OR REPLACE FUNCTION public.set_newsletter_consent(p_accepted boolean)
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
  IF p_accepted AND (account_email IS NULL OR lower(account_email) LIKE '%@telefono.traduchat.app') THEN RAISE EXCEPTION 'Verified email required'; END IF;
  IF NOT p_accepted AND previous.id IS NULL THEN RAISE EXCEPTION 'No consent to revoke'; END IF;
  INSERT INTO public.newsletter_consent_events (user_id,email,accepted)
  VALUES (account_id,CASE WHEN p_accepted THEN account_email ELSE previous.email END,p_accepted) RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_newsletter_consent(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_newsletter_consent(boolean) TO authenticated;