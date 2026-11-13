ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_length CHECK (status IS NULL OR length(status) <= 100);