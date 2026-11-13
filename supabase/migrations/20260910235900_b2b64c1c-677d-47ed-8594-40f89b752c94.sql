CREATE TABLE IF NOT EXISTS public.translation_usage (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0
);

REVOKE ALL ON public.translation_usage FROM anon, authenticated;
GRANT ALL ON public.translation_usage TO service_role;
ALTER TABLE public.translation_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bump_translation_usage(_key text, _limit integer, _window interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur integer;
BEGIN
  INSERT INTO public.translation_usage (key, window_start, count)
  VALUES (_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN public.translation_usage.window_start < now() - _window THEN 1 ELSE public.translation_usage.count + 1 END,
        window_start = CASE WHEN public.translation_usage.window_start < now() - _window THEN now() ELSE public.translation_usage.window_start END
  RETURNING count INTO cur;
  RETURN cur <= _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_translation_usage(text, integer, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_translation_usage(text, integer, interval) TO service_role;