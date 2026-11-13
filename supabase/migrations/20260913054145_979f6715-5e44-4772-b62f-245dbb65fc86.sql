CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_room_member(_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = auth.uid()
  )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE EXECUTE ON FUNCTION private.is_room_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_room_member(uuid) TO authenticated;

DROP POLICY "room_messages_select_members" ON public.room_messages;
CREATE POLICY "room_messages_select_members" ON public.room_messages
FOR SELECT TO authenticated
USING (private.is_room_member(room_id));

DROP FUNCTION public.is_room_member(uuid);