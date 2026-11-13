CREATE TABLE public.ai_credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  free_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_credit_wallets TO authenticated;
GRANT ALL ON public.ai_credit_wallets TO service_role;
ALTER TABLE public.ai_credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own AI credit wallet"
  ON public.ai_credit_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.ai_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paddle_transaction_id text NOT NULL UNIQUE,
  price_id text NOT NULL,
  credits integer NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_credit_purchases TO authenticated;
GRANT ALL ON public.ai_credit_purchases TO service_role;
ALTER TABLE public.ai_credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own AI credit purchases"
  ON public.ai_credit_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);