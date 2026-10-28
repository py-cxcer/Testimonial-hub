-- 0005_widget_types.sql
-- Adds the new Wall of Love widget types to the embed layout enum.
-- Run this in the Supabase SQL editor. Each statement is idempotent.
-- (ALTER TYPE ... ADD VALUE cannot run inside a transaction block that also uses the
-- new value, so these are standalone statements and nothing here uses them.)

alter type public.embed_layout add value if not exists 'marquee';
alter type public.embed_layout add value if not exists 'single';
alter type public.embed_layout add value if not exists 'badge';
