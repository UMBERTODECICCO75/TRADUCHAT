ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS invite_only boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_user_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS room_invites_room_email_key
  ON public.room_invites (room_id, lower(invitee_email));
CREATE INDEX IF NOT EXISTS room_invites_email_idx ON public.room_invites (lower(invitee_email));
CREATE INDEX IF NOT EXISTS room_invites_user_idx ON public.room_invites (invitee_user_id);

REVOKE ALL ON public.room_invites FROM anon, authenticated;
GRANT ALL ON public.room_invites TO service_role;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;