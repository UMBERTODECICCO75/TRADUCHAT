CREATE TABLE public.video_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
 caller_id uuid NOT NULL, callee_id uuid NOT NULL, caller_device uuid NOT NULL, callee_device uuid,
 status text NOT NULL DEFAULT 'ringing' CHECK(status IN ('ringing','active','ended')),
 caller_seen timestamptz NOT NULL DEFAULT now(), callee_seen timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz,
 CHECK(caller_id <> callee_id)
);
GRANT SELECT ON public.video_calls TO authenticated;
GRANT ALL ON public.video_calls TO service_role;
ALTER TABLE public.video_calls ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_video_member(p_room uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.room_members WHERE room_id=p_room AND user_id=auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_video_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_video_member(uuid) TO authenticated;
CREATE POLICY video_pair_read ON public.video_calls FOR SELECT TO authenticated USING ((auth.uid()=caller_id OR auth.uid()=callee_id) AND public.is_video_member(room_id));
CREATE UNIQUE INDEX video_one_room ON public.video_calls(room_id) WHERE status <> 'ended';
CREATE TABLE public.video_call_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, call_id uuid NOT NULL REFERENCES public.video_calls(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL, recipient_id uuid NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_call_events TO authenticated;
GRANT ALL ON public.video_call_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.video_call_events_id_seq TO service_role;
ALTER TABLE public.video_call_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_event_read ON public.video_call_events FOR SELECT TO authenticated USING (recipient_id=auth.uid() AND EXISTS(SELECT 1 FROM public.video_calls c WHERE c.id=call_id AND c.status='active' AND public.is_video_member(c.room_id) AND (auth.uid()=c.caller_id OR auth.uid()=c.callee_id)));
CREATE INDEX video_events_call ON public.video_call_events(call_id,id);
CREATE FUNCTION public.video_call_action(p_room uuid,p_device uuid,p_action text,p_call uuid DEFAULT NULL,p_target uuid DEFAULT NULL,p_payload jsonb DEFAULT NULL,p_after bigint DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); c public.video_calls; other uuid; events jsonb;
BEGIN
 IF u IS NULL OR NOT public.is_video_member(p_room) THEN RAISE EXCEPTION 'Accesso alla conversazione negato'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_room::text,0));
 UPDATE public.video_calls SET status='ended',ended_at=now() WHERE room_id=p_room AND status<>'ended' AND ((status='ringing' AND created_at<now()-interval '60 seconds') OR (status='active' AND (caller_seen<now()-interval '45 seconds' OR callee_seen<now()-interval '45 seconds')));
 DELETE FROM public.video_call_events WHERE call_id IN (SELECT id FROM public.video_calls WHERE room_id=p_room AND status='ended');
 IF p_action='start' THEN
  IF p_target IS NULL OR p_target=u OR NOT EXISTS(SELECT 1 FROM public.room_members WHERE room_id=p_room AND user_id=p_target) THEN RAISE EXCEPTION 'Partecipante non valido'; END IF;
  IF EXISTS(SELECT 1 FROM public.video_calls WHERE room_id=p_room AND status<>'ended') THEN RAISE EXCEPTION 'Una chiamata è già in corso'; END IF;
  INSERT INTO public.video_calls(room_id,caller_id,callee_id,caller_device) VALUES(p_room,u,p_target,p_device) RETURNING * INTO c;
 ELSIF p_action='poll' THEN
  SELECT * INTO c FROM public.video_calls WHERE room_id=p_room AND (caller_id=u OR callee_id=u) AND (status<>'ended' OR id=p_call) ORDER BY created_at DESC LIMIT 1;
 ELSE
  SELECT * INTO c FROM public.video_calls WHERE id=p_call AND room_id=p_room AND (caller_id=u OR callee_id=u) FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Chiamata non trovata'; END IF;
  IF p_action='accept' THEN
   IF c.callee_id<>u OR c.status<>'ringing' THEN RAISE EXCEPTION 'Chiamata non disponibile'; END IF;
   UPDATE public.video_calls SET status='active',callee_device=p_device,callee_seen=now(),caller_seen=now() WHERE id=c.id RETURNING * INTO c;
  ELSE
   IF (u=c.caller_id AND p_device<>c.caller_device) OR (u=c.callee_id AND c.callee_device IS NOT NULL AND p_device<>c.callee_device) THEN RAISE EXCEPTION 'Chiamata aperta su un altro dispositivo'; END IF;
   IF p_action='end' THEN
    UPDATE public.video_calls SET status='ended',ended_at=COALESCE(ended_at,now()) WHERE id=c.id RETURNING * INTO c;
    DELETE FROM public.video_call_events WHERE call_id=c.id;
   ELSIF p_action='heartbeat' OR p_action='signal' THEN
    IF c.status<>'active' THEN RAISE EXCEPTION 'Chiamata non attiva'; END IF;
    UPDATE public.video_calls SET caller_seen=CASE WHEN u=caller_id THEN now() ELSE caller_seen END,callee_seen=CASE WHEN u=callee_id THEN now() ELSE callee_seen END WHERE id=c.id RETURNING * INTO c;
    IF p_action='signal' THEN
     IF p_payload IS NULL OR octet_length(p_payload::text)>65536 OR p_payload->>'type' NOT IN ('offer','answer','candidate') THEN RAISE EXCEPTION 'Segnale non valido'; END IF;
     other:=CASE WHEN u=c.caller_id THEN c.callee_id ELSE c.caller_id END;
     INSERT INTO public.video_call_events(call_id,sender_id,recipient_id,payload) VALUES(c.id,u,other,p_payload);
    END IF;
   ELSE RAISE EXCEPTION 'Azione non valida'; END IF;
  END IF;
 END IF;
 IF c.id IS NULL THEN RETURN jsonb_build_object('call',NULL,'events','[]'::jsonb); END IF;
 IF c.status='active' AND ((u=c.caller_id AND p_device=c.caller_device) OR (u=c.callee_id AND p_device=c.callee_device)) THEN
  SELECT COALESCE(jsonb_agg(e ORDER BY e.id),'[]'::jsonb) INTO events FROM (SELECT id,payload FROM public.video_call_events WHERE call_id=c.id AND recipient_id=u AND id>p_after ORDER BY id LIMIT 100) e;
 ELSE events:='[]'::jsonb; END IF;
 RETURN jsonb_build_object('call',to_jsonb(c),'events',events);
END; $$;
REVOKE ALL ON FUNCTION public.video_call_action(uuid,uuid,text,uuid,uuid,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.video_call_action(uuid,uuid,text,uuid,uuid,jsonb,bigint) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_calls, public.video_call_events;