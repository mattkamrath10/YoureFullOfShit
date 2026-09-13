-- YFOS moderation: admin role + rejection reason + status change guard

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.stories
  add column if not exists rejection_reason text;

-- Admins can read all stories
drop policy if exists "Admins can read all stories" on public.stories;
create policy "Admins can read all stories"
  on public.stories for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Admins can update any story (approve/reject/pending)
drop policy if exists "Admins can moderate stories" on public.stories;
create policy "Admins can moderate stories"
  on public.stories for update
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

-- Admins can read all story_media
drop policy if exists "Admins can read all story media" on public.story_media;
create policy "Admins can read all story media"
  on public.story_media for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Prevent non-admins from publishing / illicit status changes
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
    -- keep is_published in sync with status for admins
    if new.status = 'published' then
      new.is_published := true;
      new.rejection_reason := null;
    elsif new.status in ('pending', 'draft', 'rejected') then
      new.is_published := false;
    end if;
    return new;
  end if;

  -- Authors may only move draft -> pending (submit), and may not publish themselves
  if auth.uid() = old.author_id
     and old.status = 'draft'
     and new.status = 'pending'
     and coalesce(new.is_published, false) = false then
    return new;
  end if;

  -- Authors may edit content while staying in draft/pending/rejected without status escalation
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

-- HOW TO MAKE YOURSELF ADMIN (run after you have a profile row):
-- update public.profiles set is_admin = true where id = '<your-auth-user-uuid>';
-- Find your id in Authentication → Users, or Table Editor → profiles.

-- Prevent ordinary users from granting themselves admin
create or replace function public.enforce_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean := false;
begin
  if new.is_admin is not distinct from old.is_admin then
    return new;
  end if;

  select coalesce(p.is_admin, false) into actor_is_admin
  from public.profiles p
  where p.id = auth.uid();

  -- Service role / SQL editor (no auth.uid) can still set the first admin
  if auth.uid() is null then
    return new;
  end if;

  if actor_is_admin then
    return new;
  end if;

  raise exception 'Not allowed to change is_admin';
end;
$$;

drop trigger if exists profiles_enforce_admin on public.profiles;
create trigger profiles_enforce_admin
  before update on public.profiles
  for each row
  execute function public.enforce_profile_admin_flag();
