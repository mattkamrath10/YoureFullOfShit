-- YFOS story reports + owner edit RLS/trigger updates
-- Safe to re-run. Does NOT drop tables. Preserves admin story approve/reject.

-- ---------------------------------------------------------------------------
-- story_reports
-- ---------------------------------------------------------------------------
create table if not exists public.story_reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint story_reports_reason_len check (
    char_length(reason) >= 1 and char_length(reason) <= 2000
  ),
  constraint story_reports_status_check check (
    status in ('open', 'reviewed', 'dismissed')
  ),
  -- One report per user per story (rate-limit spam; different reasons not allowed after first)
  unique (story_id, reporter_id)
);

create index if not exists story_reports_story_id_idx on public.story_reports (story_id);
create index if not exists story_reports_reporter_id_idx on public.story_reports (reporter_id);
create index if not exists story_reports_status_idx on public.story_reports (status);
create index if not exists story_reports_created_at_idx on public.story_reports (created_at desc);

alter table public.story_reports enable row level security;

-- Insert: authenticated only, own reporter_id (no anon insert)
drop policy if exists "Users can report stories" on public.story_reports;
create policy "Users can report stories"
  on public.story_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Select: admins see all; reporters see own
drop policy if exists "Admins can read story reports" on public.story_reports;
create policy "Admins can read story reports"
  on public.story_reports for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Users can read own story reports" on public.story_reports;
create policy "Users can read own story reports"
  on public.story_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Update status: admins only
drop policy if exists "Admins can update story report status" on public.story_reports;
create policy "Admins can update story report status"
  on public.story_reports for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

grant select, insert on table public.story_reports to authenticated;
grant update on table public.story_reports to authenticated;
revoke all on table public.story_reports from anon;
revoke insert, update, delete on table public.story_reports from anon;

-- ---------------------------------------------------------------------------
-- Owner edit: allow authors to update own non-demo stories (incl. published),
-- but resulting row must be draft/pending/rejected (published edits -> pending).
-- ---------------------------------------------------------------------------
drop policy if exists "Authors can update own stories" on public.stories;
create policy "Authors can update own stories"
  on public.stories for update
  to authenticated
  using (
    auth.uid() = author_id
    and coalesce(is_demo, false) = false
  )
  with check (
    auth.uid() = author_id
    and coalesce(is_demo, false) = false
    and status in ('draft', 'pending', 'rejected')
  );

-- Authors may move published -> pending after a content edit (re-moderation).
-- Keeps admin publish/reject path intact.
create or replace function public.enforce_story_status_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin boolean := false;
begin
  if new.status is not distinct from old.status
     and new.rejection_reason is not distinct from old.rejection_reason
     and new.is_published is not distinct from old.is_published then
    return new;
  end if;

  select coalesce(p.is_admin, false) into admin
  from public.profiles p
  where p.id = auth.uid();

  if admin then
    if new.status = 'published' then
      new.is_published := true;
      new.rejection_reason := null;
    elsif new.status in ('pending', 'draft', 'rejected') then
      new.is_published := false;
    end if;
    return new;
  end if;

  -- Authors: draft -> pending (submit)
  if auth.uid() = old.author_id
     and old.status = 'draft'
     and new.status = 'pending'
     and coalesce(new.is_published, false) = false then
    return new;
  end if;

  -- Authors: published -> pending after text/category edit (safer re-review)
  if auth.uid() = old.author_id
     and coalesce(old.is_demo, false) = false
     and old.status = 'published'
     and new.status = 'pending'
     and coalesce(new.is_published, false) = false then
    new.is_published := false;
    new.rejection_reason := null;
    return new;
  end if;

  -- Authors may edit content while staying in draft/pending/rejected
  if auth.uid() = old.author_id
     and new.status is not distinct from old.status
     and coalesce(new.is_published, false) = coalesce(old.is_published, false)
     and new.status in ('draft', 'pending', 'rejected') then
    return new;
  end if;

  raise exception 'Not allowed to change story moderation status';
end;
$$;

drop trigger if exists stories_enforce_status on public.stories;
create trigger stories_enforce_status
  before update on public.stories
  for each row
  execute function public.enforce_story_status_changes();

-- Documented behavior:
-- Text/title/category edits on a published story set status back to pending
-- and is_published=false so the story leaves Discover until an admin re-approves.
