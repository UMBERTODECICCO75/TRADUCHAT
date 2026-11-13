CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid)
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

GRANT SELECT ON public.room_messages TO authenticated;

CREATE POLICY "room_messages_select_members" ON public.room_messages
FOR SELECT TO authenticated
USING (public.is_room_member(room_id));