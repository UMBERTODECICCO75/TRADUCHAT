CREATE TABLE public.signup_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  phone text NOT NULL DEFAULT '',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_codes TO service_role;

ALTER TABLE public.signup_codes ENABLE ROW LEVEL SECURITY;
-- No policies: rows are only read and written by server code with the service role.