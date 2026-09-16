-- A0: multi-source Plus entitlements, lifetime story quota, R2 limits.
-- DO NOT APPLY TO PRODUCTION until explicitly approved.
-- Does not configure Stripe, Apple IAP, or Google Play Billing.

-- ---------------------------------------------------------------------------
-- Entitlements (many rows per user; one per billing source subscription)
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('stripe', 'apple', 'google', 'admin', 'promo')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'expired', 'revoked')),
  expires_at timestamptz,
  product_code text not null default 'lst.plus',
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entitlements_user_id_idx on public.entitlements (user_id);

create unique index if not exists entitlements_provider_sub_uidx
  on public.entitlements (source, provider_subscription_id)
  where provider_subscription_id is not null;

alter table public.entitlements enable row level security;

revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;
grant all on public.entitlements to service_role;

drop policy if exists "Users read own entitlements" on public.entitlements;
create policy "Users read own entitlements"
  on public.entitlements for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all entitlements" on public.entitlements;
create policy "Admins read all entitlements"
  on public.entitlements for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- Audit log (append-only from app/service role)
-- ---------------------------------------------------------------------------
create table if not exists public.entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.entitlements (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null,
  action text not null check (
    action in (
      'granted',
      'renewed',
      'canceled',
      'expired',
      'revoked',
      'refunded',
      'period_extended'
    )
  ),
  actor_user_id uuid references public.profiles (id) on delete set null,
  notes text,
  raw_ref text,
  created_at timestamptz not null default now()
);

create index if not exists entitlement_events_user_id_idx
  on public.entitlement_events (user_id, created_at desc);

create unique index if not exists entitlement_events_raw_ref_uidx
  on public.entitlement_events (raw_ref)
  where raw_ref is not null;

alter table public.entitlement_events enable row level security;

revoke all on public.entitlement_events from anon, authenticated;
grant select on public.entitlement_events to authenticated;
grant all on public.entitlement_events to service_role;

drop policy if exists "Users read own entitlement events" on public.entitlement_events;
create policy "Users read own entitlement events"
  on public.entitlement_events for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins read all entitlement events" on public.entitlement_events;
create policy "Admins read all entitlement events"
  on public.entitlement_events for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- Lifetime submission counter
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists stories_submitted_count integer not null default 0;

alter table public.profiles
  add column if not exists media_bytes_used bigint not null default 0;

update public.profiles p
set stories_submitted_count = sub.n
from (
  select author_id, count(*)::int as n
  from public.stories
  where author_id is not null
    and status in ('pending', 'published', 'rejected')
  group by author_id
) sub
where p.id = sub.author_id
  and p.stories_submitted_count < sub.n;

create or replace function public.profiles_quota_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.stories_submitted_count is distinct from old.stories_submitted_count then
    -- Direct PostgREST updates run as authenticated/anon.
    -- create_pending_story is SECURITY DEFINER and runs as the table owner.
    if current_user in ('authenticated', 'anon') then
      raise exception 'Cannot change stories_submitted_count';
    end if;
    if new.stories_submitted_count < old.stories_submitted_count then
      raise exception 'stories_submitted_count cannot decrease';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_quota_guard on public.profiles;
create trigger profiles_quota_guard
  before update on public.profiles
  for each row
  execute function public.profiles_quota_guard();

-- ---------------------------------------------------------------------------
-- Large-video monthly ledger (does not decrease when media/stories are deleted)
-- ---------------------------------------------------------------------------
create table if not exists public.large_video_upload_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  story_id uuid,
  byte_size bigint not null,
  object_key text,
  created_at timestamptz not null default now()
);

create index if not exists large_video_upload_log_user_month_idx
  on public.large_video_upload_log (user_id, created_at);

alter table public.large_video_upload_log enable row level security;
revoke all on public.large_video_upload_log from anon, authenticated;
grant select on public.large_video_upload_log to authenticated;
grant all on public.large_video_upload_log to service_role;

drop policy if exists "Users read own large video log" on public.large_video_upload_log;
create policy "Users read own large video log"
  on public.large_video_upload_log for select to authenticated
  using (auth.uid() = user_id);

create table if not exists public.r2_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  story_id uuid not null,
  object_key text not null unique,
  byte_size bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists r2_upload_reservations_user_idx
  on public.r2_upload_reservations (user_id);

alter table public.r2_upload_reservations enable row level security;
revoke all on public.r2_upload_reservations from anon, authenticated;
grant all on public.r2_upload_reservations to service_role;

-- ---------------------------------------------------------------------------
-- user_has_plus
-- ---------------------------------------------------------------------------
create or replace function public.user_has_plus(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = p_user_id
      and e.product_code = 'lst.plus'
      and e.status in ('active', 'canceled', 'past_due')
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke all on function public.user_has_plus(uuid) from public;
grant execute on function public.user_has_plus(uuid) to authenticated, service_role;

create or replace function public.is_email_account()
returns boolean
language sql
stable
as $$
  select
    auth.uid() is not null
    and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) is not true
    and nullif(auth.jwt()->>'email', '') is not null;
$$;

-- ---------------------------------------------------------------------------
-- Canonical pending story insert (atomic quota)
-- ---------------------------------------------------------------------------
create or replace function public.create_pending_story(
  p_category_id uuid,
  p_title text,
  p_body text,
  p_preview text,
  p_is_anonymous boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  updated int;
begin
  if uid is null or not public.is_email_account() then
    raise exception 'email_account_required'
      using errcode = '42501';
  end if;

  if p_title is null or length(trim(p_title)) = 0 or length(trim(p_title)) > 120 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if p_category_id is null then
    raise exception 'invalid_category' using errcode = '22023';
  end if;
  if p_body is not null and length(p_body) > 20000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  update public.profiles
  set stories_submitted_count = stories_submitted_count + 1
  where id = uid
    and (
      stories_submitted_count < 2
      or public.user_has_plus(uid)
    );
  get diagnostics updated = row_count;

  if updated <> 1 then
    raise exception 'plus_required'
      using errcode = 'P0001';
  end if;

  insert into public.stories (
    author_id,
    category_id,
    title,
    body,
    preview,
    is_demo,
    is_published,
    status,
    is_anonymous
  ) values (
    uid,
    p_category_id,
    trim(p_title),
    coalesce(p_body, ''),
    coalesce(nullif(trim(p_preview), ''), left(trim(p_title), 160)),
    false,
    false,
    'pending',
    coalesce(p_is_anonymous, true)
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_pending_story(uuid, text, text, text, boolean) from public;
grant execute on function public.create_pending_story(uuid, text, text, text, boolean)
  to authenticated;

-- Browser must not insert stories directly.
drop policy if exists "Authors can insert own stories" on public.stories;
drop policy if exists "Users can insert own stories" on public.stories;

-- ---------------------------------------------------------------------------
-- R2 reservation (service role / definer; auth.uid from JWT when called via user client,
-- or p_user_id from trusted server using service role wrapper in app code)
-- ---------------------------------------------------------------------------
create or replace function public.reserve_r2_upload(
  p_story_id uuid,
  p_byte_size bigint,
  p_object_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
  stored bigint;
  reserved bigint;
  month_count int;
  reservation_id uuid;
begin
  if uid is null or not public.is_email_account() then
    raise exception 'email_account_required' using errcode = '42501';
  end if;
  if p_byte_size is null or p_byte_size <= 52428800 then
    raise exception 'not_large_video' using errcode = '22023';
  end if;
  if p_byte_size > 1073741824 then
    raise exception 'video_too_large' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = uid for update;

  if not public.user_has_plus(uid) then
    raise exception 'plus_required' using errcode = 'P0001';
  end if;

  select author_id into owner
  from public.stories
  where id = p_story_id;
  if owner is null or owner <> uid then
    raise exception 'not_story_owner' using errcode = '42501';
  end if;

  -- Incomplete multipart objects should also be aborted via R2 lifecycle
  -- (abort incomplete uploads after 1 day). Reservations older than 2 hours
  -- are treated as abandoned so they cannot hold storage/month slots forever.
  delete from public.r2_upload_reservations
  where created_at < now() - interval '2 hours';

  select count(*)::int into month_count
  from public.large_video_upload_log
  where user_id = uid
    and date_trunc('month', created_at at time zone 'utc')
      = date_trunc('month', now() at time zone 'utc');

  month_count := month_count + (
    select count(*)::int
    from public.r2_upload_reservations
    where user_id = uid
      and date_trunc('month', created_at at time zone 'utc')
        = date_trunc('month', now() at time zone 'utc')
  );

  if month_count >= 10 then
    raise exception 'monthly_large_video_limit' using errcode = 'P0001';
  end if;

  select coalesce(sum(byte_size), 0) into stored
  from public.story_media
  where owner_id = uid;

  select coalesce(sum(byte_size), 0) into reserved
  from public.r2_upload_reservations
  where user_id = uid;

  if stored + reserved + p_byte_size > 10737418240 then
    raise exception 'storage_limit' using errcode = 'P0001';
  end if;

  insert into public.r2_upload_reservations (user_id, story_id, object_key, byte_size)
  values (uid, p_story_id, p_object_key, p_byte_size)
  returning id into reservation_id;

  return reservation_id;
end;
$$;

revoke all on function public.reserve_r2_upload(uuid, bigint, text) from public;
grant execute on function public.reserve_r2_upload(uuid, bigint, text) to authenticated;

create or replace function public.release_r2_upload(p_object_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  delete from public.r2_upload_reservations
  where object_key = p_object_key
    and user_id = uid;
end;
$$;

revoke all on function public.release_r2_upload(text) from public;
grant execute on function public.release_r2_upload(text) to authenticated;

create or replace function public.complete_r2_upload_log(p_object_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.r2_upload_reservations%rowtype;
begin
  if uid is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select * into rec
  from public.r2_upload_reservations
  where object_key = p_object_key
    and user_id = uid
  for update;

  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;

  insert into public.large_video_upload_log (user_id, story_id, byte_size, object_key)
  values (uid, rec.story_id, rec.byte_size, p_object_key);

  delete from public.r2_upload_reservations
  where id = rec.id;

  return jsonb_build_object(
    'story_id', rec.story_id,
    'byte_size', rec.byte_size,
    'user_id', uid
  );
end;
$$;

revoke all on function public.complete_r2_upload_log(text) from public;
grant execute on function public.complete_r2_upload_log(text) to authenticated;

create or replace function public.get_plus_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  submitted int := 0;
  has_plus boolean := false;
  exp timestamptz;
  large_month int := 0;
  stored bigint := 0;
begin
  if uid is null then
    return jsonb_build_object('authenticated', false);
  end if;

  select coalesce(stories_submitted_count, 0) into submitted
  from public.profiles
  where id = uid;

  has_plus := public.user_has_plus(uid);

  select max(e.expires_at) into exp
  from public.entitlements e
  where e.user_id = uid
    and e.product_code = 'lst.plus'
    and e.status in ('active', 'canceled', 'past_due')
    and (e.expires_at is null or e.expires_at > now());

  if exists (
    select 1 from public.entitlements e
    where e.user_id = uid
      and e.product_code = 'lst.plus'
      and e.status in ('active', 'canceled', 'past_due')
      and e.expires_at is null
  ) then
    exp := null;
  end if;

  select count(*)::int into large_month
  from public.large_video_upload_log
  where user_id = uid
    and date_trunc('month', created_at at time zone 'utc')
      = date_trunc('month', now() at time zone 'utc');

  select coalesce(sum(byte_size), 0) into stored
  from public.story_media
  where owner_id = uid;

  select stored + coalesce(sum(byte_size), 0) into stored
  from public.r2_upload_reservations
  where user_id = uid
    and status = 'reserved';

  return jsonb_build_object(
    'authenticated', true,
    'stories_submitted_count', submitted,
    'has_plus', has_plus,
    'plus_expires_at', exp,
    'plus_lifetime', has_plus and exp is null and exists (
      select 1 from public.entitlements e
      where e.user_id = uid
        and e.product_code = 'lst.plus'
        and e.status in ('active', 'canceled', 'past_due')
        and e.expires_at is null
    ),
    'large_videos_this_month', large_month,
    'storage_bytes', stored,
    'free_story_limit', 2,
    'large_videos_per_month', 10,
    'max_storage_bytes', 10737418240,
    'max_video_bytes', 1073741824
  );
end;
$$;

revoke all on function public.get_plus_usage() from public;
grant execute on function public.get_plus_usage() to authenticated;

comment on function public.create_pending_story(uuid, text, text, text, boolean) is
  'Atomic pending story insert. Increments stories_submitted_count. Guests cannot call this.';

comment on function public.user_has_plus(uuid) is
  'True if any lst.plus entitlement is active, canceled-but-unexpired, or lifetime.';

comment on table public.large_video_upload_log is
  'Completed R2 large-video uploads. Rows are kept after story/media deletion so the monthly allowance cannot be reset.';

-- ---------------------------------------------------------------------------
-- Keep profiles.media_bytes_used in sync with story_media (storage quota).
-- ---------------------------------------------------------------------------
create or replace function public.sync_profile_media_bytes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set media_bytes_used = media_bytes_used + new.byte_size
    where id = new.owner_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
    set media_bytes_used = greatest(0, media_bytes_used - old.byte_size)
    where id = old.owner_id;
    return old;
  elsif tg_op = 'UPDATE' then
    if new.owner_id = old.owner_id then
      update public.profiles
      set media_bytes_used = greatest(0, media_bytes_used - old.byte_size + new.byte_size)
      where id = new.owner_id;
    else
      update public.profiles
      set media_bytes_used = greatest(0, media_bytes_used - old.byte_size)
      where id = old.owner_id;
      update public.profiles
      set media_bytes_used = media_bytes_used + new.byte_size
      where id = new.owner_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists story_media_sync_profile_bytes on public.story_media;
create trigger story_media_sync_profile_bytes
  after insert or update or delete on public.story_media
  for each row execute function public.sync_profile_media_bytes();
