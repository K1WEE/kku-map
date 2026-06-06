-- KKU Maps: storage bucket for user-uploaded submission images
--
-- Bucket: `submission-images` (public read so the map / admin can render
-- straight from the public URL). Writes are gated to authenticated users,
-- and each user can only write under a folder named after their auth.uid()
-- so they can't clobber another user's files.

insert into storage.buckets (id, name, public)
values ('submission-images', 'submission-images', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "submission_images_public_read" on storage.objects;
create policy "submission_images_public_read"
  on storage.objects for select
  using (bucket_id = 'submission-images');

-- Authenticated users may upload to `<their uid>/<filename>`
drop policy if exists "submission_images_auth_insert" on storage.objects;
create policy "submission_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'submission-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Users may delete their own uploads (e.g. retry after a wrong pick).
-- Admins handling submissions don't need to delete user images directly;
-- pruning rejected/orphan images is a Phase-next housekeeping concern.
drop policy if exists "submission_images_auth_delete" on storage.objects;
create policy "submission_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'submission-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );
