create table if not exists public.chat_hidden_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message_id uuid not null references public.room_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);
create index if not exists chat_hidden_messages_user_idx on public.chat_hidden_messages (user_id);
grant select, insert, delete on public.chat_hidden_messages to authenticated;
grant all on public.chat_hidden_messages to service_role;
alter table public.chat_hidden_messages enable row level security;
create policy "Users read their own hidden messages" on public.chat_hidden_messages for select to authenticated using (user_id = auth.uid());
create policy "Users insert their own hidden messages" on public.chat_hidden_messages for insert to authenticated with check (user_id = auth.uid());
create policy "Users delete their own hidden messages" on public.chat_hidden_messages for delete to authenticated using (user_id = auth.uid());