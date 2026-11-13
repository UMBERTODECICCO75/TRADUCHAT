CREATE TABLE IF NOT EXISTS public.translation_cache (
  from_lang text NOT NULL,
  to_lang text NOT NULL,
  source_text text NOT NULL,
  translation text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_lang, to_lang, source_text)
);

REVOKE ALL ON public.translation_cache FROM anon, authenticated;
GRANT ALL ON public.translation_cache TO service_role;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_cached_translation(_from text, _to text, _source text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found text;
BEGIN
  UPDATE public.translation_cache
    SET hits = hits + 1, updated_at = now()
    WHERE from_lang = _from AND to_lang = _to AND source_text = _source
    RETURNING translation INTO found;
  RETURN found;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_cached_translation(_from text, _to text, _source text, _translation text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.translation_cache (from_lang, to_lang, source_text, translation)
  VALUES (_from, _to, _source, _translation)
  ON CONFLICT (from_lang, to_lang, source_text) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cached_translation(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_translation(text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.store_cached_translation(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_cached_translation(text, text, text, text) TO service_role;