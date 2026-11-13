CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.ai_credit_wallets (user_id, balance, free_granted)
  VALUES (p_user_id, 10, true)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.ai_credit_wallets
  SET balance = balance - 1, updated_at = now()
  WHERE user_id = p_user_id AND balance > 0
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Crediti IA esauriti: ricarica per continuare.';
  END IF;
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_ai_credits(p_user_id uuid, p_credits integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.ai_credit_wallets (user_id, balance, free_granted)
  VALUES (p_user_id, p_credits, true)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = ai_credit_wallets.balance + p_credits, updated_at = now()
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_ai_credits(p_user_id uuid, p_credits integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE public.ai_credit_wallets
  SET balance = GREATEST(balance - p_credits, 0), updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;
  RETURN COALESCE(new_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_credit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_ai_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deduct_ai_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_ai_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_ai_credits(uuid, integer) TO service_role;

ALTER TABLE public.ai_credit_purchases ADD COLUMN refunded_at timestamptz;