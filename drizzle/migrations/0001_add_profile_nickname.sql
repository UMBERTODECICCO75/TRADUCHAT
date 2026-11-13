ALTER TABLE public.profiles ADD COLUMN nickname text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_format CHECK (nickname IS NULL OR nickname ~ '^[[:alnum:]_]{3,24}$');
CREATE UNIQUE INDEX profiles_nickname_unique_ci ON public.profiles (lower(nickname)) WHERE nickname IS NOT NULL;