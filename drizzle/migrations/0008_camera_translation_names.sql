ALTER TABLE public.camera_translations ADD COLUMN sender_name text NOT NULL DEFAULT '', ADD COLUMN recipient_name text NOT NULL DEFAULT '';
UPDATE public.camera_translations t SET sender_name = p.username FROM public.profiles p WHERE p.id = t.sender_id;
UPDATE public.camera_translations t SET recipient_name = p.username FROM public.profiles p WHERE p.id = t.recipient_id;