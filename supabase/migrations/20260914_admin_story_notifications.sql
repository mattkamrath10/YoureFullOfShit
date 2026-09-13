-- Dedupe + audit for admin new-story email notifications.
-- Service role writes; no public client access.

create table if not exists public.admin_story_notifications (
  story_id uuid primary key references public.stories (id) on delete cascade,
  channel text not null default 'email',
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'failed')),
  emailed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

alter table public.admin_story_notifications enable row level security;

-- No policies for anon/authenticated — only service role bypasses RLS.
revoke all on public.admin_story_notifications from anon, authenticated;
grant all on public.admin_story_notifications to service_role;

comment on table public.admin_story_notifications is
  'One row per story for admin new-submission email dedupe (service role only).';
