-- YFOS social grants + guest read access
-- Fixes 42501 (permission denied) for authenticated writes when table GRANTs were missing.
-- Does NOT drop tables. Does NOT disable RLS. Does NOT grant anon write on social tables.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- story_likes
-- ---------------------------------------------------------------------------
grant select, insert, delete on table public.story_likes to authenticated;
grant select on table public.story_likes to anon;
revoke insert, update, delete on table public.story_likes from anon;

-- Keep write policies tied to auth.uid()
drop policy if exists "Users can like stories" on public.story_likes;
create policy "Users can like stories"
  on public.story_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own likes" on public.story_likes;
create policy "Users can unlike own likes"
  on public.story_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- story_comments
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.story_comments to authenticated;
grant select on table public.story_comments to anon;
revoke insert, update, delete on table public.story_comments from anon;

drop policy if exists "Authenticated users can insert own comments" on public.story_comments;
create policy "Authenticated users can insert own comments"
  on public.story_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.story_comments;
create policy "Users can update own comments"
  on public.story_comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.story_comments;
create policy "Users can delete own comments"
  on public.story_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- story_comment_reports
-- ---------------------------------------------------------------------------
grant select, insert on table public.story_comment_reports to authenticated;
revoke insert, update, delete on table public.story_comment_reports from anon;
revoke select on table public.story_comment_reports from anon;

drop policy if exists "Users can report comments" on public.story_comment_reports;
create policy "Users can report comments"
  on public.story_comment_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Own reports readable by reporter (admin policy already exists)
drop policy if exists "Users can read own comment reports" on public.story_comment_reports;
create policy "Users can read own comment reports"
  on public.story_comment_reports for select
  to authenticated
  using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- user_follows
-- ---------------------------------------------------------------------------
grant select, insert, delete on table public.user_follows to authenticated;
grant select on table public.user_follows to anon;
revoke insert, update, delete on table public.user_follows from anon;

drop policy if exists "Users can follow" on public.user_follows;
create policy "Users can follow"
  on public.user_follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.user_follows;
create policy "Users can unfollow"
  on public.user_follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- profiles (comment avatars / display names for guests)
-- ---------------------------------------------------------------------------
grant select on table public.profiles to anon, authenticated;

-- Stories public read for published is unchanged — do not weaken here.
