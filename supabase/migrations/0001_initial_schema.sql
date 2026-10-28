create extension if not exists pgcrypto;

create type public.plan_type as enum ('free', 'pro');
create type public.embed_layout as enum ('masonry', 'carousel');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan public.plan_type not null default 'free',
  status text not null default 'free',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  subtitle text check (subtitle is null or char_length(subtitle) <= 180),
  prompt text not null check (char_length(prompt) between 1 and 500),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  collect_rating boolean not null default true,
  theme text not null default 'light' check (theme in ('light', 'warm', 'dark')),
  field_config jsonb not null default
    '{"name":{"enabled":true,"required":true},"email":{"enabled":true,"required":true},"company_name":{"enabled":false,"required":false},"social_links":{"enabled":false,"required":false},"profile_photo":{"enabled":false,"required":false}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 320),
  company_name text check (company_name is null or char_length(company_name) <= 120),
  social_links jsonb not null default '{}'::jsonb,
  profile_photo_url text,
  content text not null check (char_length(content) between 10 and 5000),
  rating smallint check (rating is null or rating between 1 and 5),
  share_consent boolean not null default false,
  consent_at timestamptz,
  is_favorite boolean not null default false,
  on_wall_of_love boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_normalized text generated always as (lower(btrim(email))) stored,
  constraint consent_timestamp_consistent check (
    (share_consent = false and consent_at is null)
    or (share_consent = true and consent_at is not null)
  )
);

create table public.embed_configs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  layout public.embed_layout not null default 'masonry',
  dark_mode boolean not null default false,
  background_color text not null default '#ffffff'
    check (background_color ~ '^#[0-9A-Fa-f]{6}$'),
  animation_enabled boolean not null default false,
  show_rating boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, owner_id)
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index spaces_owner_created_idx
  on public.spaces(owner_id, created_at desc);
create index spaces_slug_idx on public.spaces(slug);
create index testimonials_space_created_idx
  on public.testimonials(space_id, created_at desc);
create index testimonials_space_visibility_idx
  on public.testimonials(space_id, is_hidden, share_consent, created_at desc);
create index testimonials_space_favorite_idx
  on public.testimonials(space_id, is_favorite desc, created_at desc);
create index testimonials_email_normalized_idx
  on public.testimonials(space_id, email_normalized);
create index embed_configs_owner_idx on public.embed_configs(owner_id);
create index subscriptions_status_idx on public.subscriptions(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger spaces_updated_at before update on public.spaces
for each row execute function public.set_updated_at();
create trigger testimonials_updated_at before update on public.testimonials
for each row execute function public.set_updated_at();
create trigger embed_configs_updated_at before update on public.embed_configs
for each row execute function public.set_updated_at();

-- Create a profile and Free subscription row for every newly registered account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'free');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.spaces enable row level security;
alter table public.testimonials enable row level security;
alter table public.embed_configs enable row level security;
alter table public.stripe_webhook_events enable row level security;

-- Profiles: owner can read/update only their own profile.
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Subscription rows are readable by the owner, but never client-writable.
create policy "subscriptions_select_own" on public.subscriptions
for select to authenticated using (user_id = (select auth.uid()));

-- Spaces: authenticated owner only.
create policy "spaces_select_own" on public.spaces
for select to authenticated using (owner_id = (select auth.uid()));
create policy "spaces_insert_own" on public.spaces
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "spaces_update_own" on public.spaces
for update to authenticated using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
create policy "spaces_delete_own" on public.spaces
for delete to authenticated using (owner_id = (select auth.uid()));

-- Testimonials: owner can read and manage testimonials belonging to owned spaces.
create policy "testimonials_select_owned_space" on public.testimonials
for select to authenticated using (
  exists (
    select 1 from public.spaces s
    where s.id = testimonials.space_id and s.owner_id = (select auth.uid())
  )
);
create policy "testimonials_update_owned_space" on public.testimonials
for update to authenticated using (
  exists (
    select 1 from public.spaces s
    where s.id = testimonials.space_id and s.owner_id = (select auth.uid())
  )
) with check (
  exists (
    select 1 from public.spaces s
    where s.id = testimonials.space_id and s.owner_id = (select auth.uid())
  )
);
create policy "testimonials_delete_owned_space" on public.testimonials
for delete to authenticated using (
  exists (
    select 1 from public.spaces s
    where s.id = testimonials.space_id and s.owner_id = (select auth.uid())
  )
);

-- Intentionally no anon/authenticated INSERT policy for testimonials.
-- Public submissions go through a server endpoint that validates the space,
-- enforces rate/plan limits, then uses a server-only admin client or a narrow
-- SECURITY DEFINER database function. Do not expose the service key.

-- Embed configs: owner only. Verify space ownership in the policy.
create policy "embed_configs_select_own" on public.embed_configs
for select to authenticated using (owner_id = (select auth.uid()));
create policy "embed_configs_insert_own" on public.embed_configs
for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (
    select 1 from public.spaces s
    where s.id = embed_configs.space_id and s.owner_id = (select auth.uid())
  )
);
create policy "embed_configs_update_own" on public.embed_configs
for update to authenticated using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid()) and exists (
    select 1 from public.spaces s
    where s.id = embed_configs.space_id and s.owner_id = (select auth.uid())
  )
);
create policy "embed_configs_delete_own" on public.embed_configs
for delete to authenticated using (owner_id = (select auth.uid()));

-- Webhook events are server-only. No client policies are created.
