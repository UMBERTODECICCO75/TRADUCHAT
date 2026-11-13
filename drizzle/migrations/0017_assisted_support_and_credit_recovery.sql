CREATE TABLE public.account_support_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id), category text NOT NULL CHECK(category IN ('privacy','assistance','copyright')), message text NOT NULL CHECK(length(message) BETWEEN 5 AND 2000), status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','completed')), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.account_support_requests TO authenticated;
GRANT ALL ON public.account_support_requests TO service_role;
ALTER TABLE public.account_support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own support requests" ON public.account_support_requests FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY "Send own support request" ON public.account_support_requests FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id AND status='requested');
CREATE OR REPLACE FUNCTION public.recover_answer_credits(p_user_id uuid,p_environment text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recovered integer;
BEGIN
 WITH expired AS (UPDATE public.ai_answer_requests SET status='failed',updated_at=now() WHERE user_id=p_user_id AND environment=p_environment AND status='pending' AND created_at<now()-interval '5 minutes' RETURNING id)
 SELECT count(*) INTO recovered FROM expired;
 IF recovered>0 THEN UPDATE public.ai_credit_balances SET balance=balance+recovered,updated_at=now() WHERE user_id=p_user_id AND environment=p_environment; END IF;
 RETURN recovered;
END;$$;
REVOKE ALL ON FUNCTION public.recover_answer_credits(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recover_answer_credits(uuid,text) TO service_role;