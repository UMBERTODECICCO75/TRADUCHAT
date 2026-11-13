ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.display_name IS 'Name shown to other participants in a conversation.';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL of the profile photo stored in the avatars bucket.';