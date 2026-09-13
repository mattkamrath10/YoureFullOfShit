-- Remove demo/fake stories from the public site.
-- Safe to re-run. Cascades to related media/votes/likes/comments if FKs are ON DELETE CASCADE.

-- Preview what will be removed (optional — run in SQL editor before delete):
-- select id, title, status, is_demo, created_at from public.stories where is_demo = true;

delete from public.stories
where is_demo = true;
