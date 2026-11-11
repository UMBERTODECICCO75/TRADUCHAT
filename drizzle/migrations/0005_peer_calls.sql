CREATE TABLE public.call_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 caller_id uuid NOT NULL REFERENCES public.profiles(id),
 callee_id uuid NOT NULL REFERENCES public.profiles(id),
 caller_name text NOT NULL,
 callee_name text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('audio','video')),
 status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','ended','rejected')),
 offer text NOT NULL,
 answer text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 seconds'),
 CHECK (caller_id <> callee_id),
 CHECK (length(offer) BETWEEN 1 AND 100000),
 CHECK (answer IS NULL OR length(answer) BETWEEN 1 AND 100000)
);
GRANT SELECT ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read calls" ON public.call_sessions FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE INDEX call_sessions_callee_created ON public.call_sessions(callee_id, created_at DESC);
CREATE INDEX call_sessions_caller_created ON public.call_sessions(caller_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;

CREATE FUNCTION public.call_directory(search_text text DEFAULT '') RETURNS TABLE(id uuid, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id, p.username FROM public.profiles p
 WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid() AND NOT p.incognito AND p.username IS NOT NULL
 AND p.username ILIKE '%' || left(search_text,80) || '%'
 ORDER BY p.username LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.call_directory(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.call_directory(text) TO authenticated;

CREATE FUNCTION public.start_peer_call(peer_id uuid, call_mode text, session_offer text) RETURNS public.call_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c public.call_sessions; my_name text; peer_name text;
BEGIN
 IF me IS NULL OR me = peer_id THEN RAISE EXCEPTION 'Accesso o destinatario non valido'; END IF;
 IF call_mode NOT IN ('audio','video') OR session_offer IS NULL OR length(session_offer) NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Chiamata non valida'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(least(me::text,peer_id::text),0));
 PERFORM pg_advisory_xact_lock(hashtextextended(greatest(me::text,peer_id::text),0));
 SELECT username INTO my_name FROM public.profiles WHERE id=me;
 SELECT username INTO peer_name FROM public.profiles WHERE id=peer_id AND NOT incognito;
 IF my_name IS NULL OR peer_name IS NULL THEN RAISE EXCEPTION 'Utente non disponibile'; END IF;
 IF EXISTS (SELECT 1 FROM public.call_sessions WHERE status IN ('ringing','accepted') AND expires_at > now() AND (caller_id IN (me,peer_id) OR callee_id IN (me,peer_id))) THEN RAISE EXCEPTION 'Utente occupato in un’altra chiamata'; END IF;
 INSERT INTO public.call_sessions(caller_id,callee_id,caller_name,callee_name,mode,offer) VALUES(me,peer_id,my_name,peer_name,call_mode,session_offer) RETURNING * INTO c;
 RETURN c;
END;
$$;
REVOKE ALL ON FUNCTION public.start_peer_call(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_peer_call(uuid,text,text) TO authenticated;

CREATE FUNCTION public.answer_peer_call(call_id uuid, session_answer text) RETURNS public.call_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.call_sessions;
BEGIN
 IF auth.uid() IS NULL OR session_answer IS NULL OR length(session_answer) NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Risposta non valida'; END IF;
 UPDATE public.call_sessions SET answer=session_answer,status='accepted',expires_at=now()+interval '90 seconds'
 WHERE id=call_id AND callee_id=auth.uid() AND status='ringing' AND expires_at>now() RETURNING * INTO c;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Chiamata terminata o scaduta'; END IF;
 RETURN c;
END;
$$;
REVOKE ALL ON FUNCTION public.answer_peer_call(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_peer_call(uuid,text) TO authenticated;

CREATE FUNCTION public.finish_peer_call(call_id uuid, decline boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.call_sessions SET status=CASE WHEN decline AND callee_id=auth.uid() AND status='ringing' THEN 'rejected' ELSE 'ended' END,expires_at=now()
 WHERE id=call_id AND auth.uid() IN (caller_id,callee_id) AND status IN ('ringing','accepted');
END;
$$;
REVOKE ALL ON FUNCTION public.finish_peer_call(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_peer_call(uuid,boolean) TO authenticated;

CREATE FUNCTION public.keep_peer_call(call_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE public.call_sessions SET expires_at=now()+interval '90 seconds' WHERE id=call_id AND status='accepted' AND expires_at>now() AND auth.uid() IN (caller_id,callee_id);
$$;
REVOKE ALL ON FUNCTION public.keep_peer_call(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.keep_peer_call(uuid) TO authenticated;