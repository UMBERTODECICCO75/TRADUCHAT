CREATE TABLE public.archive_hidden_items (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.room_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, message_id)
);
GRANT SELECT, INSERT, DELETE ON public.archive_hidden_items TO authenticated;
GRANT ALL ON public.archive_hidden_items TO service_role;
ALTER TABLE public.archive_hidden_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY archive_hidden_items_select_own ON public.archive_hidden_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY archive_hidden_items_insert_own ON public.archive_hidden_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.room_messages WHERE id = message_id));
CREATE POLICY archive_hidden_items_delete_own ON public.archive_hidden_items FOR DELETE TO authenticated USING (auth.uid() = user_id);