-- Correct A0 get_plus_usage: r2_upload_reservations rows are live reservations
-- and the table has no status column. Safe to apply after A0.

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
  where user_id = uid;

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
