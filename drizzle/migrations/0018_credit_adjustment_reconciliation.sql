ALTER TABLE public.ai_credit_balances ADD COLUMN net_balance integer NOT NULL DEFAULT 10;
UPDATE public.ai_credit_balances SET net_balance=balance;
ALTER TABLE public.ai_credit_purchases ADD COLUMN adjustment_snapshot jsonb NOT NULL DEFAULT '[]';
UPDATE public.ai_credit_purchases SET items=jsonb_build_array(jsonb_build_object('priceId',price_id,'quantity',1,'credits',credits)),refunded_credits=CASE WHEN refunded_at IS NOT NULL THEN credits ELSE refunded_credits END WHERE items='[]'::jsonb;
CREATE OR REPLACE FUNCTION public.fulfill_credit_order(p_order_id uuid,p_transaction_id text,p_environment text,p_items jsonb,p_credits integer,p_price_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.ai_checkout_orders; inserted_id uuid; b integer;
BEGIN
 SELECT * INTO o FROM public.ai_checkout_orders WHERE id=p_order_id FOR UPDATE;
 IF o.id IS NULL OR o.environment<>p_environment OR o.paddle_transaction_id<>p_transaction_id OR o.paddle_transaction_id IS NULL THEN RAISE EXCEPTION 'Ordine non valido'; END IF;
 IF p_credits<=0 THEN RAISE EXCEPTION 'Crediti non validi'; END IF;
 PERFORM public.ensure_credit_balance(o.user_id,p_environment);
 INSERT INTO public.ai_credit_purchases(user_id,paddle_transaction_id,price_id,credits,environment,items) VALUES(o.user_id,p_transaction_id,p_price_id,p_credits,p_environment,p_items) ON CONFLICT(paddle_transaction_id) DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NOT NULL THEN UPDATE public.ai_credit_balances SET net_balance=net_balance+p_credits,balance=GREATEST(net_balance+p_credits,0),updated_at=now() WHERE user_id=o.user_id AND environment=p_environment; END IF;
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
 UPDATE public.ai_credit_balances SET net_balance=net_balance-1,balance=GREATEST(net_balance-1,0),updated_at=now() WHERE user_id=p_user_id AND environment=p_environment AND balance>0 RETURNING balance INTO b;
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
   UPDATE public.ai_credit_balances SET net_balance=net_balance+1,balance=GREATEST(net_balance+1,0),updated_at=now() WHERE user_id=p_user_id AND environment=r.environment;
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
 UPDATE public.ai_credit_balances SET net_balance=net_balance-deduction,balance=GREATEST(net_balance-deduction,0),updated_at=now() WHERE user_id=p.user_id AND environment=p.environment;
 UPDATE public.ai_credit_purchases SET refunded_credits=refunded_credits+deduction,refunded_at=CASE WHEN refunded_credits+deduction>=credits THEN now() ELSE NULL END WHERE id=p.id;
 RETURN deduction;
END;$$;
CREATE OR REPLACE FUNCTION public.recover_answer_credits(p_user_id uuid,p_environment text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recovered integer;
BEGIN
 WITH expired AS (UPDATE public.ai_answer_requests SET status='failed',updated_at=now() WHERE user_id=p_user_id AND environment=p_environment AND status='pending' AND created_at<now()-interval '5 minutes' RETURNING id) SELECT count(*) INTO recovered FROM expired;
 IF recovered>0 THEN UPDATE public.ai_credit_balances SET net_balance=net_balance+recovered,balance=GREATEST(net_balance+recovered,0),updated_at=now() WHERE user_id=p_user_id AND environment=p_environment; END IF;
 RETURN recovered;
END;$$;
CREATE OR REPLACE FUNCTION public.reconcile_purchase_adjustments(p_purchase_id uuid,p_snapshot jsonb,p_target integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.ai_credit_purchases; delta integer; target integer;
BEGIN
 SELECT * INTO p FROM public.ai_credit_purchases WHERE id=p_purchase_id FOR UPDATE;
 IF p.id IS NULL OR p_target<0 OR p_target>p.credits OR jsonb_typeof(p_snapshot)<>'array' THEN RAISE EXCEPTION 'Rettifica non valida'; END IF;
 IF NOT p_snapshot @> p.adjustment_snapshot THEN RETURN 0; END IF;
 target:=p_target; delta:=target-p.refunded_credits;
 PERFORM public.ensure_credit_balance(p.user_id,p.environment);
 UPDATE public.ai_credit_balances SET net_balance=net_balance-delta,balance=GREATEST(net_balance-delta,0),updated_at=now() WHERE user_id=p.user_id AND environment=p.environment;
 UPDATE public.ai_credit_purchases SET refunded_credits=target,adjustment_snapshot=p_snapshot,refunded_at=CASE WHEN target>=credits THEN COALESCE(refunded_at,now()) ELSE NULL END WHERE id=p.id;
 RETURN delta;
END;$$;
REVOKE ALL ON FUNCTION public.reconcile_purchase_adjustments(uuid,jsonb,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_purchase_adjustments(uuid,jsonb,integer) TO service_role;