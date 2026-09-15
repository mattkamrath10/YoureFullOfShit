-- Allow permanent story deletion by its email-account author or an admin.
-- Related rows already cascade through their story foreign keys:
-- story_media, story_likes, story_comments (and comment reports), story_reports,
-- and admin_story_notifications. user_follows only references profiles.

grant delete on table public.stories to authenticated;
revoke delete on table public.stories from anon;

drop policy if exists "Authors and admins can delete stories" on public.stories;
create policy "Authors and admins can delete stories"
  on public.stories for delete
  to authenticated
  using (
    auth.uid() = author_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
