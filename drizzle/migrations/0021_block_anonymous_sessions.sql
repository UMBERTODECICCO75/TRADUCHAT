DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['account_deletion_requests','account_support_requests','ai_checkout_orders','ai_credit_balances','ai_credit_purchases','ai_credit_wallets','chat_hidden_messages','community_streams','device_sessions','stream_segments','video_call_events','video_calls'] LOOP
    EXECUTE format('CREATE POLICY "Block anonymous sessions" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (((auth.jwt() ->> ''is_anonymous'')::boolean) IS NOT TRUE) WITH CHECK (((auth.jwt() ->> ''is_anonymous'')::boolean) IS NOT TRUE)', t);
  END LOOP;
END $$;