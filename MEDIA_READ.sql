-- Allow reading story-media objects so published (and owner) story pages can load files.
-- Uploads remain restricted to the owner's folder.

drop policy if exists "Anyone can read story media files" on storage.objects;
create policy "Anyone can read story media files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'story-media');
