-- Web Push endpoints for approved YFOS administrators.
-- The endpoint and encryption keys are browser-issued subscription credentials,
-- not VAPID keys. VAPID private material stays in Render environment variables.

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  auth text not null,
  p256dh text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_id_idx
  on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;

-- Only current admins can manage their own browser endpoints. The application
-- route repeats this check before using the service role for writes.
create policy "Users manage own admin push subscriptions"
  on public.admin_push_subscriptions
  for all
  to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.is_admin = true
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.is_admin = true
    )
  );

revoke all on public.admin_push_subscriptions from anon;
grant select, insert, update, delete on public.admin_push_subscriptions to authenticated;
grant all on public.admin_push_subscriptions to service_role;

comment on table public.admin_push_subscriptions is
  'Browser Web Push subscriptions saved by admins; service role delivers pending-story alerts.';
