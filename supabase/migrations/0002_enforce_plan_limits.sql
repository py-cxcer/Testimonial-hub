-- 0002_enforce_plan_limits.sql
-- Atomic concurrency-safe enforcement of plan limits at database level

-- 1. Trigger to enforce space limit per owner atomically
create or replace function public.check_space_plan_limit()
returns trigger language plpgsql security definer as $$
declare
  current_count integer;
  user_plan public.plan_type;
  sub_status text;
  max_allowed integer;
begin
  select coalesce(plan, 'free'), coalesce(status, 'free')
  into user_plan, sub_status
  from public.subscriptions
  where user_id = new.owner_id;

  if user_plan = 'pro' and sub_status = 'active' then
    max_allowed := 25;
  else
    max_allowed := 3;
  end if;

  select count(*) into current_count
  from public.spaces
  where owner_id = new.owner_id;

  if current_count >= max_allowed then
    raise exception 'Space limit reached (% spaces allowed for % plan)', max_allowed, user_plan;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_space_plan_limit on public.spaces;
create trigger enforce_space_plan_limit
before insert on public.spaces
for each row execute function public.check_space_plan_limit();

-- 2. Trigger to enforce testimonial limit per space atomically
create or replace function public.check_testimonial_plan_limit()
returns trigger language plpgsql security definer as $$
declare
  current_count integer;
  space_owner uuid;
  user_plan public.plan_type;
  sub_status text;
  max_allowed integer;
begin
  select owner_id into space_owner
  from public.spaces
  where id = new.space_id;

  select coalesce(plan, 'free'), coalesce(status, 'free')
  into user_plan, sub_status
  from public.subscriptions
  where user_id = space_owner;

  if user_plan = 'pro' and sub_status = 'active' then
    max_allowed := 1000;
  else
    max_allowed := 100;
  end if;

  select count(*) into current_count
  from public.testimonials
  where space_id = new.space_id;

  if current_count >= max_allowed then
    raise exception 'Testimonial collection limit reached for this space (% allowed)', max_allowed;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_testimonial_plan_limit on public.testimonials;
create trigger enforce_testimonial_plan_limit
before insert on public.testimonials
for each row execute function public.check_testimonial_plan_limit();
