create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_id_idx on public.user_blocks(blocker_id);
alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;
revoke all on public.user_blocks from anon;

create policy "Users manage own blocks" on public.user_blocks
  for all to authenticated
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
