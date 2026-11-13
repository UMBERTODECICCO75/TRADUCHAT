REVOKE ALL ON public.room_members FROM anon, authenticated;
GRANT ALL ON public.room_members TO service_role;

COMMENT ON TABLE public.room_members IS 'Server-only: no Data API grants to anon/authenticated. RLS enabled with no policies (deny-by-default). Accessed exclusively via trusted server functions using the service role.';
COMMENT ON TABLE public.rooms IS 'Server-only: no Data API grants to anon/authenticated. RLS enabled with no policies (deny-by-default). Accessed exclusively via trusted server functions.';
COMMENT ON TABLE public.room_messages IS 'Server-only: no Data API grants to anon/authenticated. RLS enabled with no policies (deny-by-default). Accessed exclusively via trusted server functions.';
COMMENT ON TABLE public.room_invites IS 'Server-only: no Data API grants to anon/authenticated. RLS enabled with no policies (deny-by-default). Accessed exclusively via trusted server functions.';
COMMENT ON TABLE public.translation_usage IS 'Server-only rate-limit counters: no Data API grants to anon/authenticated. RLS enabled with no policies (deny-by-default).';