-- YFOS Phase 1 — additive story_media provider for Cloudflare R2
-- DO NOT apply until Phase 2 readiness review (created in Phase 1 for architecture only).
--
-- What this changes:
-- 1) Adds storage_provider text with default 'supabase' so existing rows keep working.
-- 2) Constrains values to ('supabase', 'r2').
-- 3) storage_path continues to mean:
--      - supabase: path inside the story-media bucket
--      - r2: object key inside the R2 bucket
--
-- No data rewrite. No drop. No RLS change in this migration.

alter table public.story_media
  add column if not exists storage_provider text;

update public.story_media
set storage_provider = 'supabase'
where storage_provider is null;

alter table public.story_media
  alter column storage_provider set default 'supabase';

alter table public.story_media
  alter column storage_provider set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'story_media_storage_provider_check'
  ) then
    alter table public.story_media
      add constraint story_media_storage_provider_check
      check (storage_provider in ('supabase', 'r2'));
  end if;
end $$;

create index if not exists story_media_storage_provider_idx
  on public.story_media (storage_provider);
