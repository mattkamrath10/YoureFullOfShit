-- YFOS social interactions: likes, comments, reports, follows
-- Soft-retire story_votes in UI only — DO NOT DROP story_votes.

-- ---------------------------------------------------------------------------
-- story_likes
-- ---------------------------------------------------------------------------
create table if not exists public.story_likes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create index if not exists story_likes_story_id_idx on public.story_likes (story_id);
create index if not exists story_likes_user_id_idx on public.story_likes (user_id);

alter table public.story_likes enable row level security;

drop policy if exists "Anyone can read story likes" on public.story_likes;
create policy "Anyone can read story likes"
  on public.story_likes for select
  using (true);

drop policy if exists "Users can like stories" on public.story_likes;
create policy "Users can like stories"
  on public.story_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own likes" on public.story_likes;
create policy "Users can unlike own likes"
  on public.story_likes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- story_comments
-- ---------------------------------------------------------------------------
create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  status text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_comments_body_len check (char_length(body) > 0 and char_length(body) <= 2000),
  constraint story_comments_status_check check (status in ('visible', 'removed', 'pending'))
);

create index if not exists story_comments_story_id_idx on public.story_comments (story_id);
create index if not exists story_comments_user_id_idx on public.story_comments (user_id);
create index if not exists story_comments_status_idx on public.story_comments (status);
create index if not exists story_comments_created_at_idx on public.story_comments (created_at desc);

alter table public.story_comments enable row level security;

drop policy if exists "Public can read visible comments" on public.story_comments;
create policy "Public can read visible comments"
  on public.story_comments for select
  using (
    status = 'visible'
    or auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Authenticated users can insert own comments" on public.story_comments;
create policy "Authenticated users can insert own comments"
  on public.story_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.story_comments;
create policy "Users can update own comments"
  on public.story_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can update comment status" on public.story_comments;
create policy "Admins can update comment status"
  on public.story_comments for update
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

drop policy if exists "Users can delete own comments" on public.story_comments;
create policy "Users can delete own comments"
  on public.story_comments for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on body/status changes
create or replace function public.touch_story_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists story_comments_touch_updated_at on public.story_comments;
create trigger story_comments_touch_updated_at
  before update on public.story_comments
  for each row
  execute function public.touch_story_comment_updated_at();

-- ---------------------------------------------------------------------------
-- story_comment_reports
-- ---------------------------------------------------------------------------
create table if not exists public.story_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.story_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists story_comment_reports_comment_id_idx
  on public.story_comment_reports (comment_id);
create index if not exists story_comment_reports_reporter_id_idx
  on public.story_comment_reports (reporter_id);

alter table public.story_comment_reports enable row level security;

drop policy if exists "Users can report comments" on public.story_comment_reports;
create policy "Users can report comments"
  on public.story_comment_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Admins can read comment reports" on public.story_comment_reports;
create policy "Admins can read comment reports"
  on public.story_comment_reports for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- user_follows
-- ---------------------------------------------------------------------------
create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_follower_id_idx on public.user_follows (follower_id);
create index if not exists user_follows_following_id_idx on public.user_follows (following_id);

alter table public.user_follows enable row level security;

drop policy if exists "Anyone can read follows" on public.user_follows;
create policy "Anyone can read follows"
  on public.user_follows for select
  using (true);

drop policy if exists "Users can follow" on public.user_follows;
create policy "Users can follow"
  on public.user_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.user_follows;
create policy "Users can unfollow"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

-- Optional helper RPCs (prefer client queries; these are convenience only)
create or replace function public.count_story_likes(p_story_id uuid)
returns bigint
language sql
stable
security invoker
as $$
  select count(*)::bigint from public.story_likes where story_id = p_story_id;
$$;

create or replace function public.count_story_comments(p_story_id uuid)
returns bigint
language sql
stable
security invoker
as $$
  select count(*)::bigint
  from public.story_comments
  where story_id = p_story_id and status = 'visible';
$$;
