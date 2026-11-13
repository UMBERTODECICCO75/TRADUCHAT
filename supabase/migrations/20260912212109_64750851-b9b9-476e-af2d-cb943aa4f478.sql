ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS show_status boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_status_length'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_status_length
      CHECK (status IS NULL OR length(status) <= 20);
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.status IS 'Breve stato personalizzato mostrato sotto il nome del partecipante (max 20 caratteri).';
COMMENT ON COLUMN public.profiles.show_status IS 'Indica se mostrare il proprio stato agli altri partecipanti.';