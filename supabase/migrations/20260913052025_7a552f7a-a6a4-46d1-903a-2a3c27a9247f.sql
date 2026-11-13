ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS rooms_is_group_idx ON public.rooms (is_group);