CREATE TABLE public.video_rooms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.profiles(id), name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_rooms TO authenticated;
GRANT ALL ON public.video_rooms TO service_role;
ALTER TABLE public.video_rooms ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.video_room_members (
 room_id uuid NOT NULL REFERENCES public.video_rooms(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id), PRIMARY KEY(room_id,user_id)
);
GRANT SELECT ON public.video_room_members TO authenticated;
GRANT ALL ON public.video_room_members TO service_role;
ALTER TABLE public.video_room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own room membership" ON public.video_room_members FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "members read rooms" ON public.video_rooms FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.video_room_members m WHERE m.room_id=id AND m.user_id=auth.uid()));
CREATE FUNCTION public.create_video_room(room_name text, invited_ids uuid[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid; me uuid:=auth.uid();
BEGIN
 IF me IS NULL THEN RAISE EXCEPTION 'Accedi per creare una stanza'; END IF;
 IF room_name IS NULL OR length(trim(room_name)) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Nome stanza non valido'; END IF;
 IF cardinality(invited_ids)>49 THEN RAISE EXCEPTION 'Troppi invitati'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(invited_ids) i WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=i AND NOT p.incognito)) THEN RAISE EXCEPTION 'Invitato non disponibile'; END IF;
 INSERT INTO public.video_rooms(owner_id,name) VALUES(me,trim(room_name)) RETURNING id INTO new_id;
 INSERT INTO public.video_room_members(room_id,user_id) VALUES(new_id,me);
 INSERT INTO public.video_room_members(room_id,user_id) SELECT new_id,i FROM unnest(invited_ids) i WHERE i<>me ON CONFLICT DO NOTHING;
 RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_video_room(text,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_video_room(text,uuid[]) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_room_members;