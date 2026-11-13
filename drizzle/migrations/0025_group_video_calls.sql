CREATE TABLE public.group_video_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
 caller_id uuid NOT NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
 answered_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);
GRANT SELECT ON public.group_video_calls TO authenticated;
GRANT ALL ON public.group_video_calls TO service_role;
ALTER TABLE public.group_video_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_call_room_read ON public.group_video_calls FOR SELECT TO authenticated USING (public.is_video_member(room_id));
CREATE UNIQUE INDEX group_video_one_room ON public.group_video_calls(room_id) WHERE status='active';
CREATE TABLE public.group_video_members (
 call_id uuid NOT NULL REFERENCES public.group_video_calls(id) ON DELETE CASCADE, user_id uuid NOT NULL,
 device uuid NOT NULL, seen_at timestamptz NOT NULL DEFAULT now(), joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(call_id,user_id)
);
GRANT SELECT ON public.group_video_members TO authenticated;
GRANT ALL ON public.group_video_members TO service_role;
ALTER TABLE public.group_video_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_members_room_read ON public.group_video_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.group_video_calls c WHERE c.id=call_id AND public.is_video_member(c.room_id)));
CREATE TABLE public.group_video_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, call_id uuid NOT NULL REFERENCES public.group_video_calls(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL, recipient_id uuid NOT NULL, recipient_device uuid NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.group_video_events TO authenticated;
GRANT ALL ON public.group_video_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.group_video_events_id_seq TO service_role;
ALTER TABLE public.group_video_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_events_recipient_read ON public.group_video_events FOR SELECT TO authenticated USING (recipient_id=auth.uid() AND EXISTS (SELECT 1 FROM public.group_video_calls c WHERE c.id=call_id AND public.is_video_member(c.room_id)));
CREATE OR REPLACE FUNCTION public.group_video_action(p_room uuid,p_device uuid,p_action text,p_call uuid DEFAULT NULL,p_target uuid DEFAULT NULL,p_payload jsonb DEFAULT NULL,p_after bigint DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); c public.group_video_calls; mine public.group_video_members; target_member public.group_video_members; members jsonb; events jsonb;
BEGIN
 IF uid IS NULL OR NOT public.is_video_member(p_room) THEN RAISE EXCEPTION 'Conversazione non disponibile.'; END IF;
 IF p_device IS NULL OR p_action NOT IN ('start','join','poll','heartbeat','signal','leave') THEN RAISE EXCEPTION 'Azione non valida.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_room::text,0));
 SELECT * INTO c FROM public.group_video_calls WHERE room_id=p_room AND status='active' FOR UPDATE;
 IF c.id IS NOT NULL THEN
   IF NOT EXISTS (SELECT 1 FROM public.group_video_members WHERE call_id=c.id AND user_id=c.caller_id AND seen_at>now()-interval '25 seconds') THEN
     UPDATE public.group_video_calls SET status='ended',ended_at=now() WHERE id=c.id;
     DELETE FROM public.group_video_events WHERE call_id=c.id;
     DELETE FROM public.group_video_members WHERE call_id=c.id;
     c:=NULL;
   ELSE
     DELETE FROM public.group_video_events e WHERE e.call_id=c.id AND EXISTS (SELECT 1 FROM public.group_video_members m WHERE m.call_id=c.id AND m.seen_at<now()-interval '25 seconds' AND (m.user_id=e.sender_id OR m.user_id=e.recipient_id));
     DELETE FROM public.group_video_members WHERE call_id=c.id AND seen_at<now()-interval '25 seconds';
   END IF;
 END IF;
 IF p_action='start' THEN
   IF c.id IS NOT NULL OR EXISTS (SELECT 1 FROM public.video_calls WHERE room_id=p_room AND status<>'ended') THEN RAISE EXCEPTION 'Una chiamata è già aperta.'; END IF;
   IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id=p_room AND is_group=true) THEN RAISE EXCEPTION 'Le chiamate di gruppo richiedono una conversazione di gruppo.'; END IF;
   INSERT INTO public.group_video_calls(room_id,caller_id) VALUES(p_room,uid) RETURNING * INTO c;
   INSERT INTO public.group_video_members(call_id,user_id,device) VALUES(c.id,uid,p_device);
 ELSIF p_action<>'poll' THEN
   IF c.id IS NULL OR c.id IS DISTINCT FROM p_call THEN RAISE EXCEPTION 'Chiamata non disponibile.'; END IF;
   SELECT * INTO mine FROM public.group_video_members WHERE call_id=c.id AND user_id=uid;
   IF p_action='join' THEN
     IF mine.user_id IS NOT NULL THEN RAISE EXCEPTION 'Chiamata già aperta su un dispositivo.'; END IF;
     IF (SELECT count(*) FROM public.group_video_members WHERE call_id=c.id)>=6 THEN RAISE EXCEPTION 'Chiamata completa: massimo 6 partecipanti.'; END IF;
     INSERT INTO public.group_video_members(call_id,user_id,device) VALUES(c.id,uid,p_device);
     UPDATE public.group_video_calls SET answered_at=coalesce(answered_at,now()) WHERE id=c.id RETURNING * INTO c;
   ELSE
     IF mine.user_id IS NULL OR mine.device IS DISTINCT FROM p_device THEN RAISE EXCEPTION 'Chiamata non disponibile su questo dispositivo.'; END IF;
     UPDATE public.group_video_members SET seen_at=now() WHERE call_id=c.id AND user_id=uid;
     IF p_action='leave' THEN
       IF uid=c.caller_id THEN
         UPDATE public.group_video_calls SET status='ended',ended_at=now() WHERE id=c.id;
         DELETE FROM public.group_video_events WHERE call_id=c.id;
         DELETE FROM public.group_video_members WHERE call_id=c.id;
         c:=NULL;
       ELSE
         DELETE FROM public.group_video_events WHERE call_id=c.id AND (sender_id=uid OR recipient_id=uid);
         DELETE FROM public.group_video_members WHERE call_id=c.id AND user_id=uid;
       END IF;
     ELSIF p_action='signal' THEN
       SELECT * INTO target_member FROM public.group_video_members WHERE call_id=c.id AND user_id=p_target;
       IF p_target=uid OR target_member.user_id IS NULL OR NOT public.is_video_member(p_room) OR p_payload IS NULL OR octet_length(p_payload::text)>65536 THEN RAISE EXCEPTION 'Destinatario o segnale non valido.'; END IF;
       INSERT INTO public.group_video_events(call_id,sender_id,recipient_id,recipient_device,payload) VALUES(c.id,uid,p_target,target_member.device,p_payload);
     END IF;
   END IF;
 END IF;
 IF c.id IS NULL THEN RETURN jsonb_build_object('call',NULL,'members','[]'::jsonb,'events','[]'::jsonb); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'device',m.device,'joined_at',m.joined_at) ORDER BY m.user_id),'[]'::jsonb) INTO members FROM public.group_video_members m WHERE call_id=c.id AND EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id=p_room AND rm.user_id=m.user_id);
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.id),'[]'::jsonb) INTO events FROM public.group_video_events e WHERE e.call_id=c.id AND e.recipient_id=uid AND e.recipient_device=p_device AND e.id>p_after AND EXISTS (SELECT 1 FROM public.group_video_members m WHERE m.call_id=c.id AND m.user_id=uid AND m.device=p_device);
 RETURN jsonb_build_object('call',to_jsonb(c),'members',members,'events',events);
END $$;
REVOKE ALL ON FUNCTION public.group_video_action(uuid,uuid,text,uuid,uuid,jsonb,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.group_video_action(uuid,uuid,text,uuid,uuid,jsonb,bigint) TO authenticated;
CREATE FUNCTION public.prevent_parallel_group_call() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.room_id::text,0));
 IF NEW.status<>'ended' AND EXISTS(SELECT 1 FROM public.group_video_calls WHERE room_id=NEW.room_id AND status='active') THEN RAISE EXCEPTION 'Una chiamata di gruppo è già aperta.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prevent_parallel_group_call BEFORE INSERT ON public.video_calls FOR EACH ROW EXECUTE FUNCTION public.prevent_parallel_group_call();