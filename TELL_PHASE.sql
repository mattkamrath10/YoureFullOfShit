-- YFOS Tell Your Story phase: status, anonymity, media foundation

-- Status + anonymity on stories
alter table public.stories
  add column if not exists status text,
  add column if not exists is_anonymous boolean not null default false;

update public.stories
set status = case when is_published then 'published' else 'pending' end
where status is null;

alter table public.stories
  alter column status set default 'pending';

alter table public.stories
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stories_status_check'
  ) then
    alter table public.stories
      add constraint stories_status_check
      check (status in ('draft', 'pending', 'published', 'rejected'));
  end if;
end $$;

create index if not exists stories_status_idx on public.stories (status);
create index if not exists stories_author_id_idx on public.stories (author_id);

-- Replace public read policy: published only
drop policy if exists "Published stories are viewable by everyone" on public.stories;
create policy "Published stories are viewable by everyone"
  on public.stories for select
  using (status = 'published');

-- Authors can read their own stories (any status)
drop policy if exists "Authors can read own stories" on public.stories;
create policy "Authors can read own stories"
  on public.stories for select
  using (auth.uid() = author_id);

-- Authors can insert draft/pending stories they own
drop policy if exists "Authors can insert own stories" on public.stories;
create policy "Authors can insert own stories"
  on public.stories for insert
  with check (
    auth.uid() = author_id
    and status in ('draft', 'pending')
  );

-- Authors can update own non-published stories
drop policy if exists "Authors can update own stories" on public.stories;
create policy "Authors can update own stories"
  on public.stories for update
  using (auth.uid() = author_id and status in ('draft', 'pending', 'rejected'))
  with check (auth.uid() = author_id and status in ('draft', 'pending', 'rejected'));

-- story_media table
create table if not exists public.story_media (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  media_type text not null check (media_type in ('video', 'image', 'document')),
  storage_path text not null,
  file_name text,
  mime_type text,
  byte_size bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists story_media_story_id_idx on public.story_media (story_id);
create index if not exists story_media_owner_id_idx on public.story_media (owner_id);

alter table public.story_media enable row level security;

drop policy if exists "Published story media is viewable by everyone" on public.story_media;
create policy "Published story media is viewable by everyone"
  on public.story_media for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_id and s.status = 'published'
    )
  );

drop policy if exists "Owners can read own media" on public.story_media;
create policy "Owners can read own media"
  on public.story_media for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners can insert own media" on public.story_media;
create policy "Owners can insert own media"
  on public.story_media for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

drop policy if exists "Owners can update own media" on public.story_media;
create policy "Owners can update own media"
  on public.story_media for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete own media" on public.story_media;
create policy "Owners can delete own media"
  on public.story_media for delete
  using (auth.uid() = owner_id);

grant select on table public.story_media to anon, authenticated;
grant insert, update, delete on table public.story_media to authenticated;

-- Storage bucket for story media (private; signed URLs later for playback)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media',
  'story-media',
  false,
  104857600,
  array[
    'video/mp4', 'video/webm', 'video/quicktime',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own story media" on storage.objects;
create policy "Users can upload own story media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own story media objects" on storage.objects;
create policy "Users can update own story media objects"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own story media objects" on storage.objects;
create policy "Users can delete own story media objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own story media objects" on storage.objects;
create policy "Users can read own story media objects"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
