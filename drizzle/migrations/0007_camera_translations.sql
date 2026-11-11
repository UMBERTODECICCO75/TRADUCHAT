CREATE TABLE public.camera_translations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 original_text text NOT NULL,
 translated_text text NOT NULL,
 target_language text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT camera_translation_other_participant CHECK (sender_id <> recipient_id)
);
GRANT SELECT, INSERT, DELETE ON public.camera_translations TO authenticated;
GRANT ALL ON public.camera_translations TO service_role;
ALTER TABLE public.camera_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read camera translations" ON public.camera_translations FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Send own camera translation" ON public.camera_translations FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);
CREATE POLICY "Sender deletes camera translation" ON public.camera_translations FOR DELETE TO authenticated USING (auth.uid() = sender_id);
CREATE INDEX camera_translations_participants ON public.camera_translations(sender_id, recipient_id, created_at);
CREATE INDEX camera_translations_recipient ON public.camera_translations(recipient_id, created_at);