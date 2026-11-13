-- Anonymous sign-ins carry the authenticated role, so authenticated-facing
-- policies also apply to guests. TraduChat does not use guest sessions:
-- deny them explicitly on every table with authenticated policies.
CREATE POLICY archive_hidden_items_deny_anonymous ON public.archive_hidden_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY profile_stories_deny_anonymous ON public.profile_stories
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY profiles_deny_anonymous ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY room_messages_deny_anonymous ON public.room_messages
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY translations_deny_anonymous ON public.translations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);

CREATE POLICY user_roles_deny_anonymous ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE)
  WITH CHECK ((auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE);