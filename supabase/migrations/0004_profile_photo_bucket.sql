-- 0004_profile_photo_bucket.sql
-- Public bucket for submitter profile photos.
-- Objects are written only by the server (service role) through
-- /api/uploads/profile-photo, which sniffs the file type and caps the size.
-- No storage.objects policies are created, so anonymous/authenticated clients
-- cannot upload, overwrite, delete or list objects; public URLs are still readable.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
