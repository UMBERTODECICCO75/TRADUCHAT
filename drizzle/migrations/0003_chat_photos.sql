CREATE TABLE public.chat_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid,
  chat_key text NOT NULL,
  path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_photos TO authenticated;
GRANT ALL ON public.chat_photos TO service_role;
ALTER TABLE public.chat_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read photos" ON public.chat_photos FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "send own photos" ON public.chat_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND split_part(path, '/', 1) = auth.uid()::text);
CREATE POLICY "delete own photos" ON public.chat_photos FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
CREATE INDEX chat_photos_chat_idx ON public.chat_photos (chat_key, created_at);

CREATE POLICY "upload own chat photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "read chat photos as participant" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-photos' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.chat_photos p WHERE p.path = storage.objects.name AND p.recipient_id = auth.uid())
  ));