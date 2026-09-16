drop policy if exists "Public can read visible comments" on public.story_comments;
create policy "Public can read visible comments"
  on public.story_comments for select
  using (
    (status = 'visible' and not exists (select 1 from public.user_blocks b where b.blocker_id = auth.uid() and b.blocked_id = user_id))
    or auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists "Authenticated users can insert own comments" on public.story_comments;
create policy "Authenticated users can insert own comments"
  on public.story_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.stories s join public.user_blocks b on b.blocked_id = s.author_id
      where s.id = story_id and b.blocker_id = auth.uid()
    )
  );
