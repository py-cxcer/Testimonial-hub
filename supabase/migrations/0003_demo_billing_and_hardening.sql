-- 0003_demo_billing_and_hardening.sql
--
-- 1. Replace Stripe billing with a database-backed DEMO subscription model.
--    No payment gateway is involved; "pro" is only ever a simulated plan.
-- 2. Make plan-limit enforcement concurrency safe (advisory locks) and pin
--    search_path on SECURITY DEFINER functions.
-- 3. Stop owners from rewriting immutable submission data (consent, email,
--    creation time, owning space) through direct PostgREST updates.
-- 4. Backfill profile/subscription rows for accounts created before the
--    signup trigger existed.

-- ---------------------------------------------------------------------------
-- 1. Demo subscription model
-- ---------------------------------------------------------------------------

-- Normalise legacy rows before adding constraints (free plan => status 'free').
update public.subscriptions set status = 'free' where plan = 'free';
update public.subscriptions
set status = 'active'
where plan = 'pro';

alter table public.subscriptions
  add column if not exists billing_mode text not null default 'none',
  add column if not exists demo_upgraded_at timestamptz;

update public.subscriptions set billing_mode = 'demo' where plan = 'pro';

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_mode_check,
  drop constraint if exists subscriptions_plan_consistent;

alter table public.subscriptions
  add constraint subscriptions_billing_mode_check
    check (billing_mode in ('none', 'demo')),
  -- A Pro row can only ever be a demo subscription that is active.
  add constraint subscriptions_plan_consistent check (
    (plan = 'free' and billing_mode = 'none' and status = 'free')
    or (plan = 'pro' and billing_mode = 'demo' and status = 'active')
  );

-- Stripe artefacts are no longer used.
drop table if exists public.stripe_webhook_events;
alter table public.subscriptions
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id,
  drop column if exists current_period_end,
  drop column if exists cancel_at_period_end;

-- ---------------------------------------------------------------------------
-- 2. Entitlements + concurrency-safe limits
-- ---------------------------------------------------------------------------

create or replace function public.is_pro(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user and s.plan = 'pro' and s.status = 'active'
  );
$$;

revoke all on function public.is_pro(uuid) from public, anon, authenticated;

create or replace function public.check_space_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  max_allowed integer;
begin
  -- Serialise concurrent space inserts for the same owner so the count below
  -- cannot be stale. The lock is released at commit/rollback.
  perform pg_advisory_xact_lock(hashtextextended('spaces:' || new.owner_id::text, 0));

  max_allowed := case when public.is_pro(new.owner_id) then 25 else 3 end;

  select count(*) into current_count
  from public.spaces
  where owner_id = new.owner_id;

  if current_count >= max_allowed then
    raise exception 'SPACE_LIMIT_REACHED: % spaces allowed on your current plan', max_allowed;
  end if;

  return new;
end;
$$;

create or replace function public.check_testimonial_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  space_owner uuid;
  max_allowed integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('testimonials:' || new.space_id::text, 0));

  select owner_id into space_owner
  from public.spaces
  where id = new.space_id;

  max_allowed := case when public.is_pro(space_owner) then 1000 else 100 end;

  -- Every stored testimonial counts (hidden or not) so hiding/favoriting can
  -- never be used to bypass the cap.
  select count(*) into current_count
  from public.testimonials
  where space_id = new.space_id;

  if current_count >= max_allowed then
    raise exception 'TESTIMONIAL_LIMIT_REACHED: % testimonials allowed for this space', max_allowed;
  end if;

  return new;
end;
$$;

-- Triggers from 0002 already point at these function names; recreate for clarity.
drop trigger if exists enforce_space_plan_limit on public.spaces;
create trigger enforce_space_plan_limit
before insert on public.spaces
for each row execute function public.check_space_plan_limit();

drop trigger if exists enforce_testimonial_plan_limit on public.testimonials;
create trigger enforce_testimonial_plan_limit
before insert on public.testimonials
for each row execute function public.check_testimonial_plan_limit();

-- ---------------------------------------------------------------------------
-- 3. Immutable testimonial columns
-- ---------------------------------------------------------------------------

create or replace function public.protect_testimonial_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.space_id is distinct from old.space_id
     or new.email is distinct from old.email
     or new.share_consent is distinct from old.share_consent
     or new.consent_at is distinct from old.consent_at
     or new.created_at is distinct from old.created_at then
    raise exception 'IMMUTABLE_COLUMN: id, space, email, consent and creation time cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists testimonials_protect_immutable on public.testimonials;
create trigger testimonials_protect_immutable
before update on public.testimonials
for each row execute function public.protect_testimonial_immutable_columns();

-- ---------------------------------------------------------------------------
-- Demo plan switching (the ONLY way a client can change its own plan)
-- ---------------------------------------------------------------------------

create or replace function public.set_demo_plan(p_plan public.plan_type)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.subscriptions;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  -- INSERT .. ON CONFLICT takes the row lock, so concurrent calls serialise and
  -- repeating the same call is a no-op (idempotent).
  insert into public.subscriptions as s (user_id, plan, status, billing_mode, demo_upgraded_at)
  values (
    uid,
    p_plan,
    case when p_plan = 'pro' then 'active' else 'free' end,
    case when p_plan = 'pro' then 'demo' else 'none' end,
    case when p_plan = 'pro' then now() else null end
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = excluded.status,
    billing_mode = excluded.billing_mode,
    demo_upgraded_at = case
      when excluded.plan = 'pro' and s.plan = 'pro'
        then s.demo_upgraded_at
      when excluded.plan = 'pro' then excluded.demo_upgraded_at
      else null
    end
  returning * into result;

  return result;
end;
$$;

revoke all on function public.set_demo_plan(public.plan_type) from public, anon;
grant execute on function public.set_demo_plan(public.plan_type) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill for pre-existing accounts
-- ---------------------------------------------------------------------------

insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.subscriptions (user_id, plan, status, billing_mode)
select u.id, 'free', 'free', 'none'
from auth.users u
on conflict (user_id) do nothing;
