-- YFOS storyteller (avatar narrator). Separate from profiles.avatar_url (profile photo).
-- Safe / idempotent. Run in Supabase SQL Editor.
-- RLS already allows a signed-in user to update their own profiles row
-- (see 20260912_profile_avatar.sql). This only adds the column.

alter table public.profiles
  add column if not exists narrator_avatar_id text;

comment on column public.profiles.narrator_avatar_id is
  'Catalog id for the story narrator (maya, alex, jordan, riley, marcus, sofia). Not the profile photo.';
