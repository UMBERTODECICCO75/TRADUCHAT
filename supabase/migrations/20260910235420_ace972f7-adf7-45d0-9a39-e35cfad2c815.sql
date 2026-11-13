-- Remove permissive anonymous policies on rooms
DROP POLICY IF EXISTS "Anyone can read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.rooms;

-- Remove permissive anonymous policies on room_messages
DROP POLICY IF EXISTS "Anyone can read room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Anyone can send room messages" ON public.room_messages;

-- Revoke direct Data API access; all access goes through trusted server functions
REVOKE ALL ON public.rooms FROM anon, authenticated;
REVOKE ALL ON public.room_messages FROM anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.room_messages TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Room codes must be unique so a code identifies exactly one conversation
CREATE UNIQUE INDEX IF NOT EXISTS rooms_code_key ON public.rooms (code);