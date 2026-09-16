-- Hardening + Apple transaction binding. Do not apply to production until approved.

create table if not exists public.apple_transaction_bindings (
  original_transaction_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.apple_transaction_bindings enable row level security;
revoke all on public.apple_transaction_bindings from anon, authenticated;
grant all on public.apple_transaction_bindings to service_role;

create or replace function public.is_confirmed_email_account()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email is not null
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) is not true
  );
$$;

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
    raise exception 'email_account_required' using errcode = '42501';
  end if;
  if not public.is_confirmed_email_account() then
    raise exception 'email_unconfirmed' using errcode = '42501';
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
    raise exception 'plus_required' using errcode = 'P0001';
  end if;

  insert into public.stories (
    author_id, category_id, title, body, preview, is_demo, is_published, status, is_anonymous
  ) values (
    uid, p_category_id, trim(p_title), coalesce(p_body, ''),
    coalesce(nullif(trim(p_preview), ''), left(trim(p_title), 160)),
    false, false, 'pending', coalesce(p_is_anonymous, true)
  )
  returning id into new_id;

  return new_id;
end;
$$;
