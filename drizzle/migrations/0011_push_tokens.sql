create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "push_tokens_select_own" on public.push_tokens for select to authenticated using (auth.uid() = user_id);
create policy "push_tokens_insert_own" on public.push_tokens for insert to authenticated with check (auth.uid() = user_id);
create policy "push_tokens_delete_own" on public.push_tokens for delete to authenticated using (auth.uid() = user_id);
grant select, insert, delete on public.push_tokens to authenticated;