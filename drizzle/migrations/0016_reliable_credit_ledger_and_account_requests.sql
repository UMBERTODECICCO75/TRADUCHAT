CREATE TABLE public.ai_credit_balances (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK (environment IN ('sandbox','live')),
 balance integer NOT NULL DEFAULT 10 CHECK (balance >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,environment)
);
GRANT SELECT ON public.ai_credit_balances TO authenticated;
GRANT ALL ON public.ai_credit_balances TO service_role;
ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own balances" ON public.ai_credit_balances FOR SELECT TO authenticated USING (auth.uid()=user_id);
INSERT INTO public.ai_credit_balances(user_id,environment,balance)
SELECT w.user_id,'live',w.balance FROM public.ai_credit_wallets w;
INSERT INTO public.ai_credit_balances(user_id,environment,balance)
SELECT w.user_id,'sandbox',w.balance FROM public.ai_credit_wallets w WHERE NOT EXISTS(SELECT 1 FROM public.ai_credit_purchases p WHERE p.user_id=w.user_id);
COMMENT ON TABLE public.ai_credit_wallets IS 'DEPRECATED: replaced by environment-scoped ai_credit_balances; retained for compatibility with older deployments.';
ALTER TABLE public.ai_credit_purchases ADD COLUMN items jsonb NOT NULL DEFAULT '[]', ADD COLUMN refunded_credits integer NOT NULL DEFAULT 0;
CREATE TABLE public.ai_checkout_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), environment text NOT NULL CHECK(environment IN ('sandbox','live')), price_id text NOT NULL, paddle_transaction_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_checkout_orders TO authenticated;
GRANT ALL ON public.ai_checkout_orders TO service_role;
ALTER TABLE public.ai_checkout_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own orders" ON public.ai_checkout_orders FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE TABLE public.ai_credit_adjustments (
 adjustment_id text PRIMARY KEY, purchase_id uuid NOT NULL REFERENCES public.ai_credit_purchases(id), credits integer NOT NULL CHECK(credits>=0), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_credit_adjustments TO service_role;
ALTER TABLE public.ai_credit_adjustments ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.ai_answer_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, environment text NOT NULL CHECK(environment IN ('sandbox','live')), question text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')), answer text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_answer_requests TO service_role;
ALTER TABLE public.ai_answer_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.account_deletion_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','completed')), note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own deletion requests" ON public.account_deletion_requests FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY "Request own deletion" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id AND status='requested');
CREATE UNIQUE INDEX one_open_deletion_request ON public.account_deletion_requests(user_id) WHERE status <> 'completed';
CREATE TABLE public.phone_login_identities (
 phone text PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE
);
GRANT ALL ON public.phone_login_identities TO service_role;
ALTER TABLE public.phone_login_identities ENABLE ROW LEVEL SECURITY;
INSERT INTO public.phone_login_identities(phone,user_id)
SELECT '+'||split_part(u.email,'@',1),p.id FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE u.email ~ '^[0-9]+@telefono[.]traduchat[.]app$';
CREATE OR REPLACE FUNCTION public.ensure_credit_balance(p_user_id uuid,p_environment text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b integer;
BEGIN
 INSERT INTO public.ai_credit_balances(user_id,environment) VALUES(p_user_id,p_environment) ON CONFLICT DO NOTHING;
 SELECT balance INTO b FROM public.ai_credit_balances WHERE user_id=p_user_id AND environment=p_environment;
 RETURN b;
END;$$;
CREATE OR REPLACE FUNCTION public.fulfill_credit_order(p_order_id uuid,p_transaction_id text,p_environment text,p_items jsonb,p_credits integer,p_price_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.ai_checkout_orders; inserted_id uuid; b integer;
BEGIN
 SELECT * INTO o FROM public.ai_checkout_orders WHERE id=p_order_id FOR UPDATE;
 IF o.id IS NULL OR o.environment<>p_environment OR o.paddle_transaction_id<>p_transaction_id OR o.paddle_transaction_id IS NULL THEN RAISE EXCEPTION 'Ordine non valido'; END IF;
 IF p_credits<=0 THEN RAISE EXCEPTION 'Crediti non validi'; END IF;
 PERFORM public.ensure_credit_balance(o.user_id,p_environment);
 INSERT INTO public.ai_credit_purchases(user_id,paddle_transaction_id,price_id,credits,environment,items) VALUES(o.user_id,p_transaction_id,p_price_id,p_credits,p_environment,p_items) ON CONFLICT(paddle_transaction_id) DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NOT NULL THEN UPDATE public.ai_credit_balances SET balance=balance+p_credits,updated_at=now() WHERE user_id=o.user_id AND environment=p_environment; END IF;
 SELECT balance INTO b FROM public.ai_credit_balances WHERE user_id=o.user_id AND environment=p_environment;
 RETURN b;
END;$$;
CREATE OR REPLACE FUNCTION public.reserve_answer_credit(p_request_id uuid,p_user_id uuid,p_environment text,p_question text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.ai_answer_requests; b integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO r FROM public.ai_answer_requests WHERE id=p_request_id;
 IF r.id IS NOT NULL THEN
  IF r.user_id<>p_user_id OR r.environment<>p_environment OR r.question<>p_question THEN RAISE EXCEPTION 'Richiesta non valida'; END IF;
  SELECT balance INTO b FROM public.ai_credit_balances WHERE user_id=p_user_id AND environment=p_environment;
  RETURN jsonb_build_object('status',r.status,'answer',r.answer,'balance',b,'reserved',false);
 END IF;
 PERFORM public.ensure_credit_balance(p_user_id,p_environment);
 UPDATE public.ai_credit_balances SET balance=balance-1,updated_at=now() WHERE user_id=p_user_id AND environment=p_environment AND balance>0 RETURNING balance INTO b;
 IF b IS NULL THEN RAISE EXCEPTION 'Crediti IA esauriti: ricarica per continuare.'; END IF;
 INSERT INTO public.ai_answer_requests(id,user_id,environment,question) VALUES(p_request_id,p_user_id,p_environment,p_question);
 RETURN jsonb_build_object('status','pending','balance',b,'reserved',true);
END;$$;
CREATE OR REPLACE FUNCTION public.settle_answer_credit(p_request_id uuid,p_user_id uuid,p_answer text DEFAULT NULL) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.ai_answer_requests; b integer;
BEGIN
 SELECT * INTO r FROM public.ai_answer_requests WHERE id=p_request_id AND user_id=p_user_id FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Richiesta non valida'; END IF;
 IF r.status='pending' THEN
  IF p_answer IS NULL OR length(trim(p_answer))=0 THEN
   UPDATE public.ai_credit_balances SET balance=balance+1,updated_at=now() WHERE user_id=p_user_id AND environment=r.environment;
   UPDATE public.ai_answer_requests SET status='failed',updated_at=now() WHERE id=r.id;
  ELSE UPDATE public.ai_answer_requests SET status='completed',answer=p_answer,updated_at=now() WHERE id=r.id; END IF;
 END IF;
 SELECT balance INTO b FROM public.ai_credit_balances WHERE user_id=p_user_id AND environment=r.environment;
 RETURN b;
END;$$;
CREATE OR REPLACE FUNCTION public.apply_credit_adjustment(p_adjustment_id text,p_purchase_id uuid,p_credits integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.ai_credit_purchases; claimed text; deduction integer;
BEGIN
 SELECT * INTO p FROM public.ai_credit_purchases WHERE id=p_purchase_id FOR UPDATE;
 IF p.id IS NULL OR p_credits<0 THEN RAISE EXCEPTION 'Rimborso non valido'; END IF;
 deduction:=LEAST(p_credits,GREATEST(p.credits-p.refunded_credits,0));
 INSERT INTO public.ai_credit_adjustments(adjustment_id,purchase_id,credits) VALUES(p_adjustment_id,p.id,deduction) ON CONFLICT DO NOTHING RETURNING adjustment_id INTO claimed;
 IF claimed IS NULL THEN RETURN 0; END IF;
 PERFORM public.ensure_credit_balance(p.user_id,p.environment);
 UPDATE public.ai_credit_balances SET balance=GREATEST(balance-deduction,0),updated_at=now() WHERE user_id=p.user_id AND environment=p.environment;
 UPDATE public.ai_credit_purchases SET refunded_credits=refunded_credits+deduction,refunded_at=CASE WHEN refunded_credits+deduction>=credits THEN now() ELSE NULL END WHERE id=p.id;
 RETURN deduction;
END;$$;
CREATE OR REPLACE FUNCTION public.claim_signup_code(p_email text,p_hash text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.signup_codes;
BEGIN
 SELECT * INTO c FROM public.signup_codes WHERE email=p_email FOR UPDATE;
 IF c.email IS NULL THEN RETURN 'missing'; END IF;
 IF c.expires_at<now() THEN RETURN 'expired'; END IF;
 IF c.attempts>=5 THEN RETURN 'limited'; END IF;
 IF c.code_hash<>p_hash THEN UPDATE public.signup_codes SET attempts=attempts+1 WHERE email=p_email; RETURN 'invalid'; END IF;
 DELETE FROM public.signup_codes WHERE email=p_email;
 RETURN 'approved';
END;$$;
REVOKE ALL ON FUNCTION public.ensure_credit_balance(uuid,text),public.fulfill_credit_order(uuid,text,text,jsonb,integer,text),public.reserve_answer_credit(uuid,uuid,text,text),public.settle_answer_credit(uuid,uuid,text),public.apply_credit_adjustment(text,uuid,integer),public.claim_signup_code(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_credit_balance(uuid,text),public.fulfill_credit_order(uuid,text,text,jsonb,integer,text),public.reserve_answer_credit(uuid,uuid,text,text),public.settle_answer_credit(uuid,uuid,text),public.apply_credit_adjustment(text,uuid,integer),public.claim_signup_code(text,text) TO service_role;