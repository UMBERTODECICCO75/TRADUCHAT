CREATE TABLE public.profile_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

GRANT SELECT, INSERT, DELETE ON public.profile_stories TO authenticated;
GRANT ALL ON public.profile_stories TO service_role;

ALTER TABLE public.profile_stories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.shares_room_with(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_members a
    JOIN room_members b ON b.room_id = a.room_id
    WHERE a.user_id = auth.uid()
      AND b.user_id = _target
  )
$$;

CREATE POLICY profile_stories_select_own_or_contacts
ON public.profile_stories
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR private.shares_room_with(user_id));

CREATE POLICY profile_stories_insert_own
ON public.profile_stories
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY profile_stories_delete_own
ON public.profile_stories
FOR DELETE
TO authenticated
USING (user_id = auth.uid());