ALTER TABLE public.room_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS room_members_room_last_seen_idx
  ON public.room_members (room_id, last_seen_at);