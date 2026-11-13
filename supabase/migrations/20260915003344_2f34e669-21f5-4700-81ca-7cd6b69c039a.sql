ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_length;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_length
  CHECK (status IS NULL OR length(status) <= 80);

COMMENT ON COLUMN public.profiles.status IS 'Stato personalizzato mostrato sotto il nome del partecipante (max 80 caratteri, numeri inclusi).';