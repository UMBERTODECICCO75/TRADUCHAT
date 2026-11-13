ALTER TABLE public.agenda_reminders
  ADD COLUMN IF NOT EXISTS send_sms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;