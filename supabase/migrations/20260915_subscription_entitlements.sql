create table if not exists public.subscription_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  product_id text not null,
  status text not null check (status in ('active', 'expired', 'revoked')),
  expires_at timestamptz,
  source text not null default 'app_store',
  updated_at timestamptz not null default now()
);
alter table public.subscription_entitlements enable row level security;
grant select on public.subscription_entitlements to authenticated;
revoke insert, update, delete on public.subscription_entitlements from authenticated, anon;
create policy "Users read own entitlement" on public.subscription_entitlements
  for select to authenticated using (auth.uid() = user_id);
