# Testimonial Hub --- Master Implementation Guide

**Audience:** Solo developer or AI coding agent\
**Status:** Execution guide for the MVP\
**Product:** Testimonial collection, management, and embedding SaaS\
**Recommended stack:** Next.js App Router, TypeScript, Tailwind CSS,
Supabase (Postgres/Auth/Storage), Zod, Stripe Checkout, Vercel

> **Billing update:** Stripe was removed. Phase 7 and Section 6 / 10.3 below are
> SUPERSEDED by the demo subscription flow in `PRD.md` section 1a. Do not
> implement Stripe unless explicitly requested.

> Build one phase at a time. Keep the app runnable after every phase,
> run checks before moving on, and never weaken security to make a demo
> work. Treat this guide as an implementation contract; where framework
> APIs evolve, use the currently installed stable API and verify against
> its official documentation.

------------------------------------------------------------------------

## 0. Product Rules and Non-Negotiable Decisions

### Plans and limits

  Capability                 Free                Pro
  ------------------------ ------ ------------------
  Monthly price               \$0   \$9.99 USD/month
  Spaces                        3                 25
  Testimonials per space      100              1,000

-   A testimonial can be displayed publicly only if
    `share_consent = true` **and** `is_hidden = false`.
-   Consent is unchecked by default. Consent must not be inferred from
    submission.
-   Owner pages and server actions must verify ownership on the server.
-   Enforce plan limits server-side. UI checks are helpful feedback, not
    security.
-   Checkout redirects do not grant paid access. The verified Stripe
    webhook is authoritative.
-   On downgrade, keep existing data. If usage exceeds Free limits,
    block new usage above the limit and explain why; never silently
    delete data.
-   Normalize emails by trimming whitespace and lowercasing before
    storing.
-   Do not expose submitter email, social links, or other private fields
    through public embed APIs.
-   "Distinct submitters" is a count of distinct normalized emails.
    Explain that this is an approximation, not verified identity.
-   The public page slug is public, but it must be unique and
    collision-checked. Use a random suffix or UUID-derived slug rather
    than relying only on a title.

### Scope boundaries

Included: auth, spaces, configurable fields, themes, public submissions,
consent, rating, inbox management, Wall of Love, analytics, embed
builder, plans, Stripe Checkout/webhooks, responsive states, deployment.

Not included in MVP: video capture, team accounts, custom domains,
complex tax handling, multiple paid tiers, coupons, email campaigns,
public space discovery.

------------------------------------------------------------------------

## 1. Architecture

### 1.1 Request/data flow

``` text
Browser
  ├─ Owner UI (authenticated)
  │    └─ Server Actions / Route Handlers
  │         ├─ Supabase server client (user JWT + RLS)
  │         ├─ authorization and Zod validation
  │         └─ database queries / mutations
  ├─ Public collection page (/s/[slug])
  │    └─ public server query + rate-limited submission endpoint
  ├─ Embed builder (authenticated preview)
  │    └─ safe public embed renderer (/embed/[spaceId])
  └─ Stripe Checkout
       └─ Stripe webhook (/api/stripe/webhook)
            └─ signature verification → idempotency record → subscription sync
```

**Principles** 1. Use the Supabase user-scoped client for normal owner
data access so RLS is active. 2. Use a server-only service-role client
only for operations that cannot be safely performed with user-scoped
access, such as verified Stripe webhook reconciliation or carefully
designed public submission insertion. Keep it in a server-only module
and expose only narrow functions. 3. Any privileged query must
independently validate input and resource ownership. A service-role key
bypasses RLS. 4. Public routes return explicit DTOs containing only
fields intended for public display. 5. Never send secrets, full database
rows, private email addresses, or Stripe identifiers to Client
Components. 6. Use database constraints and transactions/atomic
functions for concurrent limit enforcement where practical. A plain
"count then insert" can race under simultaneous requests.

### 1.2 Recommended dependencies

Use current stable compatible versions, pin them in the lockfile, and
avoid unnecessary packages.

``` bash
npx create-next-app@latest testimonial-hub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd testimonial-hub
npm install @supabase/supabase-js @supabase/ssr zod stripe @stripe/stripe-js recharts lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Use Playwright for browser end-to-end tests if the environment permits:

``` bash
npm install -D @playwright/test
npx playwright install
```

If using a component library, install only what the project needs. Do
not let the AI agent add multiple overlapping UI libraries.

### 1.3 Directory structure

``` text
testimonial-hub/
├── public/
│   └── images/                         # Optional static assets only
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── auth/callback/route.ts
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # Authenticated shell/navigation
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── spaces/page.tsx
│   │   │   ├── spaces/new/page.tsx
│   │   │   ├── spaces/[spaceId]/page.tsx
│   │   │   ├── spaces/[spaceId]/edit/page.tsx
│   │   │   ├── inbox/page.tsx
│   │   │   ├── wall-of-love/page.tsx
│   │   │   ├── embeds/page.tsx
│   │   │   ├── embeds/[spaceId]/page.tsx
│   │   │   └── billing/page.tsx
│   │   ├── s/[slug]/page.tsx           # Public testimonial form
│   │   ├── embed/[spaceId]/page.tsx    # Public iframe renderer
│   │   ├── api/
│   │   │   ├── testimonials/route.ts   # Public submission POST
│   │   │   ├── embed/[spaceId]/route.ts # Optional public DTO endpoint
│   │   │   └── stripe/
│   │   │       ├── checkout/route.ts
│   │   │       ├── portal/route.ts
│   │   │       └── webhook/route.ts
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx                    # Landing page / redirect
│   ├── components/
│   │   ├── ui/                         # Buttons, inputs, dialogs, badges
│   │   ├── app-shell/
│   │   ├── spaces/
│   │   ├── testimonials/
│   │   ├── dashboard/
│   │   ├── embeds/
│   │   └── billing/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   ├── admin.ts                # Server-only; privileged access
│   │   │   └── middleware.ts
│   │   ├── auth/require-user.ts
│   │   ├── validation/
│   │   │   ├── spaces.ts
│   │   │   └── testimonials.ts
│   │   ├── plans.ts
│   │   ├── rate-limit.ts
│   │   ├── stripe.ts
│   │   ├── public-dto.ts
│   │   ├── errors.ts
│   │   └── utils.ts
│   ├── actions/
│   │   ├── spaces.ts
│   │   ├── testimonials.ts
│   │   ├── embeds.ts
│   │   └── billing.ts
│   ├── types/
│   │   ├── database.types.ts           # Generate from Supabase
│   │   └── domain.ts
│   └── middleware.ts                   # Session refresh/protected route helper
├── supabase/
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Do not put every query into page components. Put domain logic in `lib/`
and `actions/`, and keep UI components focused on presentation.

------------------------------------------------------------------------

## 2. Environment and Supabase Setup

### 2.1 `.env.example`

Create this file and commit it with placeholders only:

``` dotenv
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase: Project URL and public/anon key are safe for browser use with RLS.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only. NEVER prefix with NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=

# Stripe server-only
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# Optional: use a managed Redis/KV service for distributed rate limiting.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Never commit `.env.local`. Validate required variables at startup or at
the point of use. Do not make the build fail for optional local
integrations that are not used by a particular phase.

### 2.2 Supabase clients

`src/lib/supabase/browser.ts`:

``` ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

`src/lib/supabase/server.ts`:

``` ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot always write cookies.
            // Refresh sessions in middleware/Proxy according to installed Next.js version.
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/admin.ts` --- server-only:

``` ts
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration");

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

Use the currently supported Next.js middleware/proxy convention to
refresh Supabase auth cookies. The exact filename can differ by Next.js
version; follow the installed version's documentation. Middleware is not
a replacement for server-side authorization in actions and route
handlers.

### 2.3 Authentication helper

`src/lib/auth/require-user.ts`:

``` ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");
  return { supabase, user };
}
```

Use `getUser()` for trusted server-side identity checks; do not trust
user IDs supplied by a form or client payload.

------------------------------------------------------------------------

## 3. Database Schema and RLS

Create `supabase/migrations/0001_initial_schema.sql`, run it against a
local Supabase project first, then commit all future schema changes as
new migrations. Do not edit a migration already applied to shared
environments; create a follow-up migration.

> This schema is a production-oriented starting point, not a substitute
> for reviewing the deployed policies. Test policies using separate
> authenticated users and the anon role.

### 3.1 Initial migration

``` sql
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
```

### 3.2 Important RLS and database notes

1.  RLS policies are additive. Do not create a broad policy like
    `using (true)` for public reads of `testimonials`.
2.  The SQL above intentionally has no public insert policy. Public
    submissions must pass through the validated server endpoint or a
    narrowly scoped database function.
3.  Do not let authenticated users update `subscriptions.plan` or
    billing fields. If column-level grants are not explicitly
    configured, keep subscription writes server-only and verify the
    actual Postgres grants in the Supabase project.
4.  RLS does not enforce the Free/Pro count limits. A concurrent request
    can pass a count check twice. For robust enforcement, create a
    Postgres RPC that locks a per-user row or uses an advisory lock,
    checks the plan and count, and inserts within one transaction. Use
    the same pattern for per-space testimonial limits.
5.  If using `SECURITY DEFINER` functions, set a fixed `search_path`,
    qualify table names, validate all arguments, revoke execution from
    `public` by default, and grant execute only to the intended role.
6.  The `profiles` and `subscriptions` signup trigger must be tested. A
    trigger failure can prevent signup.
7.  Generate TypeScript database types after schema changes:

``` bash
npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/database.types.ts
```

Use the local Supabase CLI workflow when possible so development and
production schema changes are reproducible.

------------------------------------------------------------------------

## 4. Validation, Plan Helpers, and Server-Side Mutations

### 4.1 Zod schemas

`src/lib/validation/spaces.ts`:

``` ts
import { z } from "zod";

const fieldSetting = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
}).superRefine((value, ctx) => {
  if (!value.enabled && value.required) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A disabled field cannot be required",
      path: ["required"],
    });
  }
});

export const fieldConfigSchema = z.object({
  name: fieldSetting,
  email: fieldSetting,
  company_name: fieldSetting,
  social_links: fieldSetting,
  profile_photo: fieldSetting,
}).superRefine((config, ctx) => {
  if (!config.name.enabled || !config.name.required) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Name must be enabled and required",
      path: ["name"],
    });
  }
  if (!config.email.enabled || !config.email.required) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Email must be enabled and required",
      path: ["email"],
    });
  }
});

export const createSpaceSchema = z.object({
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(180).optional().or(z.literal("")),
  prompt: z.string().trim().min(1).max(500),
  collectRating: z.boolean().default(true),
  theme: z.enum(["light", "warm", "dark"]).default("light"),
  fieldConfig: fieldConfigSchema,
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
```

If the product later allows name/email to be optional, update the schema
and public submission renderer together. Do not allow the UI and server
rules to diverge.

`src/lib/validation/testimonials.ts`:

``` ts
import { z } from "zod";

export const publicSubmissionBaseSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9][a-z0-9-]+$/),
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().max(320).optional().default(""),
  company_name: z.string().trim().max(120).optional().default(""),
  social_links: z.record(z.string(), z.string().trim().max(500)).optional().default({}),
  content: z.string().trim().min(10).max(5000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  share_consent: z.boolean().default(false),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export function validateAgainstSpaceConfig(
  input: z.infer<typeof publicSubmissionBaseSchema>,
  config: {
    collect_rating: boolean;
    field_config: Record<string, { enabled: boolean; required: boolean }>;
  },
) {
  const errors: Record<string, string> = {};
  const fields = config.field_config;

  for (const key of ["name", "email", "company_name", "social_links", "profile_photo"]) {
    const setting = fields[key];
    if (!setting?.enabled) continue;
    const value = input[key as keyof typeof input];
    const empty = value === undefined || value === null || value === "" ||
      (typeof value === "object" && value !== null && Object.keys(value).length === 0);

    if (setting.required && empty) errors[key] = "This field is required";
  }

  if (fields.email?.enabled && input.email && !z.string().email().safeParse(input.email).success) {
    errors.email = "Enter a valid email address";
  }
  if (!config.collect_rating && input.rating != null) {
    errors.rating = "This space does not collect ratings";
  }
  if (config.collect_rating && input.rating != null && (input.rating < 1 || input.rating > 5)) {
    errors.rating = "Rating must be between 1 and 5";
  }

  return errors;
}
```

For profile-photo uploads, use a separate upload flow with strict
size/type checks and an unpredictable storage object name. The public
submission API should accept only a valid uploaded asset reference, not
an arbitrary URL. The schema above is a skeleton; add a proper
URL/handle parser for social links, and ensure disabled fields are
discarded rather than stored.

### 4.2 Plan helper

`src/lib/plans.ts`:

``` ts
export const PLAN_LIMITS = {
  free: { spaces: 3, testimonialsPerSpace: 100 },
  pro: { spaces: 25, testimonialsPerSpace: 1000 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function getLimits(plan: Plan) {
  return PLAN_LIMITS[plan];
}
```

Never accept `plan` from client input. Read the current subscription
from the database. Decide centrally whether statuses such as `active`
and `trialing` grant Pro. For a simple MVP, grant Pro only when the
database says `plan = 'pro'` and status is `active` (and optionally
`trialing` if trials are introduced). `past_due`, `unpaid`, `canceled`,
and `incomplete_expired` must not silently grant ongoing Pro access.

### 4.3 Create space server action

`src/actions/spaces.ts`:

``` ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createSpaceSchema } from "@/lib/validation/spaces";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

function makeSlug(title: string) {
  const base = title.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45) || "space";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createSpaceAction(rawInput: unknown) {
  const parsed = createSpaceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, error: "Please correct the form fields", issues: parsed.error.flatten() };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Please sign in" };

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .single();

  if (subError || !sub) return { ok: false as const, error: "Could not verify plan" };
  const plan: Plan = sub.plan === "pro" && sub.status === "active" ? "pro" : "free";
  const { count, error: countError } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) return { ok: false as const, error: "Could not check space usage" };
  if ((count ?? 0) >= PLAN_LIMITS[plan].spaces) {
    return { ok: false as const, error: "Space limit reached. Upgrade your plan to create more spaces." };
  }

  const input = parsed.data;
  const { data, error } = await supabase.from("spaces").insert({
    owner_id: user.id,
    title: input.title,
    subtitle: input.subtitle || null,
    prompt: input.prompt,
    slug: makeSlug(input.title),
    collect_rating: input.collectRating,
    theme: input.theme,
    field_config: input.fieldConfig,
  }).select("id,slug").single();

  if (error || !data) {
    // Handle unique slug collision with one retry in production code.
    return { ok: false as const, error: "Could not create space. Please try again." };
  }

  revalidatePath("/spaces");
  revalidatePath("/dashboard");
  return {
    ok: true as const,
    spaceId: data.id,
    publicUrl: `${process.env.NEXT_PUBLIC_APP_URL}/s/${data.slug}`,
  };
}
```

**Production hardening:** the count-and-insert sequence above is an
understandable skeleton, but it is not concurrency-safe. Replace it with
a transaction/RPC that atomically checks the count and inserts the
space, or otherwise serialize creation per user. Also retry a slug
collision. Use `NEXT_PUBLIC_APP_URL` only as a validated configured
origin, never from an untrusted `Host` header.

### 4.4 Public submission endpoint design

Use `POST /api/testimonials` rather than a public Server Action if it
simplifies rate limiting, request-size controls, and API tests. Steps:

1.  Parse JSON safely and reject oversized bodies.
2.  Validate base input with Zod.
3.  Resolve the space by slug; return a generic not-found response for
    missing/unavailable spaces.
4.  Read `field_config` and `collect_rating`; validate required fields
    against the current config.
5.  Verify the honeypot is empty and apply distributed rate limits by IP
    hash and space ID. Do not store raw IP longer than necessary;
    document retention.
6.  Check the current plan and per-space submission count.
7.  Insert only enabled fields. Normalize email. If consent is true, set
    `consent_at = now()`; otherwise set it to `null`.
8.  Use an atomic database operation to enforce the per-space limit.
    Count-then-insert alone can race.
9.  Return a success DTO only; never return owner details or private
    database fields.
10. Apply anti-abuse controls: request body limit, field length limits,
    rate limiting, honeypot, generic errors, and optionally CAPTCHA if
    abuse becomes material.

A public submission must not be allowed to set `is_favorite`,
`on_wall_of_love`, or `is_hidden`. Set these fields on the server to
safe defaults.

**Limit behavior:** if a space has reached its plan limit, reject new
submissions with a friendly "This collection is currently full" page. Do
not delete or overwrite existing submissions.

------------------------------------------------------------------------

## 5. Phase-by-Phase Implementation Plan and Copy-Paste Prompts

Use one prompt per phase. After each phase, inspect the diff, run tests,
and commit. If the agent tries to implement later phases early, ask it
to stop and finish the current acceptance criteria first.

### Phase 1 --- Foundation, auth, schema, and shell

**Prompt to paste into the coding agent:**

``` text
Read IMPLEMENTATION_GUIDE.md completely and follow it as the source of truth.
Implement Phase 1 only: initialize the Next.js App Router TypeScript project,
configure Tailwind, Supabase browser/server/admin clients, environment validation,
auth signup/login/logout, session refresh using the installed Next.js convention,
protected authenticated route group, shared responsive app shell, loading/error
states, and the initial Supabase migration/schema/RLS policies.

Do not implement spaces, public submissions, embeds, or Stripe yet. Never expose
the Supabase service-role key. Use getUser() for server-side identity checks.
Add README setup steps and .env.example. Add tests for auth helpers and ensure
unauthenticated users cannot access protected pages. Run lint, typecheck, and
tests; fix all failures. Report files changed, commands run, and remaining issues.
```

**Manual verification** - Signup creates an Auth user, profile row, and
Free subscription row. - Login/logout work. - Unauthenticated access to
`/dashboard` redirects to `/login`. - User A cannot read or update User
B's profile/subscription. - No secret appears in client bundles or
browser network payloads.

### Phase 2 --- Spaces and field configuration

``` text
Implement Phase 2 only from IMPLEMENTATION_GUIDE.md. Build the spaces list,
create/edit forms, title/subtitle/prompt, rating toggle, three themes, and
field-config controls. Name and email must remain enabled and required by
default. Validate all input with the provided Zod schema on the server. Create
a unique public slug, show a success page with a copy-link button, and enforce
Free/Pro space limits on the server. Keep all queries owner-scoped and protected
by RLS. Add empty/loading/error states and tests for invalid inputs, slug
collisions, and limits. Do not build the public submission form yet.
```

**Manual verification** - Free owner can create exactly 3 spaces and
cannot create a fourth. - A Pro fixture can create up to 25 spaces. -
Disabled fields cannot remain required. - Directly posting invalid input
is rejected. - Owner cannot edit a space by guessing another owner's ID.

### Phase 3 --- Public submissions

``` text
Implement Phase 3 only. Build /s/[slug] as a public no-login testimonial form
that renders the current space title, subtitle, prompt, theme, configured fields,
and optional rating. Add POST /api/testimonials with Zod validation, server-side
dynamic field validation, email normalization, consent checkbox unchecked by
default, consent timestamp, honeypot, body-size limits, rate limiting, and safe
photo-upload handling. Enforce the per-space Free/Pro testimonial cap on the
server using an atomic transaction/RPC rather than count-then-insert. Ignore
client attempts to set moderation/favorite flags. Render a friendly success
screen and prevent accidental duplicate submissions. Add tests for every field
configuration and consent behavior. Do not expose submitter emails through any
public endpoint.
```

**Manual verification** - Submission works without login. - Required
fields depend on current space configuration. - A rating is rejected if
the space does not collect ratings. - Consent false stores
`consent_at = null`; consent true stores a timestamp. - Disabled fields
are not persisted. - At the limit, a new submission is rejected without
changing existing records. - Rate limits and honeypot reject automated
requests.

### Phase 4 --- Inbox and Wall of Love

``` text
Implement Phase 4 only. Build the authenticated inbox with pagination, search,
filters (space/date/rating/visibility/favorite), and a detail view. Add actions
to favorite/unfavorite, add/remove from Wall of Love, edit, hide/show, and
delete with confirmation. Keep favorite and Wall of Love as separate flags.
All mutations must verify ownership on the server and use Zod. Do not allow an
owner to change space_id to a space they do not own. Publicly displayed items
must be visible and consented. Add a Wall of Love owner page and tests proving
cross-owner access is denied.
```

**Manual verification** - Hidden items never render publicly. -
Unconsented items never render publicly even if an owner favorites
them. - Delete requires confirmation and removes the item from embeds. -
Editing updates `updated_at`. - Every action fails safely for
nonexistent or foreign-owned IDs.

### Phase 5 --- Dashboard and analytics

``` text
Implement Phase 5 only. Build the dashboard from real database aggregates:
total testimonials, distinct normalized email count, number of spaces, plan
usage, remaining limits, and a daily collection chart. Add 7/30/90-day and
all-time filters. Include empty states and a Free-plan upgrade banner that is
hidden for Pro. Ensure queries are owner-scoped and do not leak other users'
statistics. Use pagination or aggregate queries instead of fetching every
testimonial into the browser. Add tests for date boundaries, empty data, and
distinct submitter counts.
```

**Manual verification** - Counts match known test data. - Date range
boundaries use a consistent timezone (UTC for storage; display in the
user's locale). - Dashboard does not load every testimonial just to
count them. - Free banner and usage indicators reflect authoritative
subscription data.

### Phase 6 --- Embed builder and public renderer

``` text
Implement Phase 6 only. Build an authenticated embed builder for a selected
owned space. Support masonry/grid and carousel, dark mode, background color,
animation toggle (off by default), and optional rating display. Add a live
preview and a copyable snippet that embeds /embed/[spaceId] in a responsive
iframe. The public renderer must query only visible testimonials with
share_consent=true and return a strict public DTO containing only displayable
fields. Never return email, social links, internal flags, or owner information.
Validate colors/layout server-side, support reduced-motion, set appropriate
iframe sandbox/referrer settings, and test hidden/unconsented data exclusion.
```

**Manual verification** - A snippet works on a separate local HTML page
and a different origin. - Public renderer never includes email/social
links or moderation metadata. - Empty state works when no consented
visible testimonials exist. - Invalid config falls back safely. -
Carousel is keyboard accessible and animation respects reduced motion.

### Phase 7 --- Stripe billing and webhooks (SUPERSEDED: demo billing implemented instead; see PRD section 1a)

``` text
Implement Phase 7 only. Add a billing page showing Free and Pro plans, current
plan, usage, and upgrade/manage actions. Create Checkout sessions server-side
for the configured Stripe Price ID; the browser must never choose an arbitrary
price. Attach the authenticated user ID in Checkout metadata and associate a
Stripe customer with the user's subscription row. Implement a raw-body webhook
route with Stripe signature verification and idempotency using
stripe_webhook_events. Handle checkout.session.completed,
customer.subscription.created/updated/deleted, and invoice.payment_failed.
Synchronize plan/status/period-end/cancel state from Stripe objects. Never grant
Pro from the success redirect. Add a Billing Portal route if practical. Add
tests for duplicate events, invalid signatures, failed payment, cancellation,
and out-of-order events.
```

**Manual verification** - A completed redirect without a webhook does
not grant Pro. - A valid webhook updates the database; duplicate
delivery is harmless. - Invalid signature returns 400 and performs no
writes. - The correct user is associated through server-controlled
metadata/customer ID. - Billing page reflects webhook state after
refresh. - Payment failure/cancellation applies the defined access
policy and preserves data.

### Phase 8 --- Hardening and release

``` text
Implement Phase 8 only. Audit the complete app against IMPLEMENTATION_GUIDE.md.
Add unit, integration, RLS, and end-to-end tests for auth, ownership, limits,
public submissions, consent, embed filtering, and Stripe webhooks. Test rate
limiting, request size, upload validation, XSS payloads, empty/loading/error
states, keyboard navigation, reduced motion, mobile layouts, and failed
network requests. Review all privileged queries, service-role usage, secrets,
headers, logging, and public DTOs. Fix issues, run lint/typecheck/tests/build,
update README deployment steps, and produce a final security checklist. Do not
claim a test passed unless you actually ran it.
```

------------------------------------------------------------------------

## 6. Stripe Integration Details (SUPERSEDED - not implemented in this version)

### 6.1 Checkout route

Create Checkout sessions on the server only. Read the authenticated
user, load their subscription row, and create/reuse a Stripe customer
associated with that user. Configure a single known Price ID in
`STRIPE_PRO_PRICE_ID`.

`src/lib/stripe.ts`:

``` ts
import "server-only";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

`src/app/api/stripe/checkout/route.ts` skeleton:

``` ts
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const { user, supabase } = await requireApiUser();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (subscription?.plan === "pro" && subscription.status === "active") {
    return NextResponse.json({ error: "Already subscribed" }, { status: 409 });
  }

  const price = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!price || !appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  let customerId = subscription?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // Persist customerId using a server-side, authorized update.
    // If this write fails, do not proceed without reconciling the created customer.
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    allow_promotion_codes: false,
  });

  return NextResponse.json({ url: session.url });
}
```

Implement `requireApiUser()` to return a 401 JSON response for
unauthenticated API requests rather than redirecting. Add CSRF/origin
protections appropriate to your cookie-authenticated POST endpoints and
rate-limit Checkout session creation. Avoid creating duplicate Stripe
customers under concurrent requests; use a database lock/unique mapping
or recover by looking up the customer by stable metadata.

### 6.2 Webhook route

Important requirements: - Read the raw request body using
`await request.text()`; do not parse JSON first. - Verify
`stripe-signature` with
`stripe.webhooks.constructEvent(rawBody, signature, secret)`. - Process
each event idempotently. - A simple "insert event ID, then update
subscription" approach can lose an event if the process crashes after
inserting the event row but before the update. Prefer a transaction/RPC
that claims the event and applies the subscription mutation atomically.
If not available initially, store `processing`/`processed` status and
implement retry-safe reconciliation. - Events may arrive out of order.
Retrieve the current subscription from Stripe when processing a
subscription event instead of blindly trusting stale event fields. - Map
the Stripe customer/subscription to an existing user using a previously
persisted customer ID or trusted server-created metadata. Never trust a
user ID supplied in an arbitrary browser request. - Return 2xx only
after durable processing; Stripe retries non-2xx responses.

Illustrative route skeleton:

``` ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Missing webhook signature/config" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Production: replace this sketch with an atomic SQL RPC that claims and
  // processes event IDs in one transaction, with retry-safe state transitions.
  const { data: existing } = await admin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ received: true, duplicate: true });

  const { error: claimError } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  if (claimError) {
    // A unique-key conflict may be a duplicate; other DB errors should return
    // non-2xx so Stripe retries. Do not silently swallow database failures.
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Verify mode === "subscription"; resolve user by trusted metadata/customer.
        // Retrieve the subscription from Stripe and sync authoritative status.
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Retrieve current subscription from Stripe if needed; map customer to user;
        // sync plan, status, period end, cancel_at_period_end.
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // Resolve the subscription/customer, then sync current status from Stripe.
        // Decide whether to retain Pro during Stripe's retry/grace period.
        break;
      }
      default:
        // Ignore event types not used by this MVP.
        break;
    }

    // Mark event processed only after subscription sync has succeeded.
    return NextResponse.json({ received: true });
  } catch {
    // Because this illustrative claim is not atomic, production code must have
    // a recoverable event state and retry strategy before launch.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
```

This skeleton intentionally marks the atomicity gap; do not ship it
unchanged. Implement a database RPC such as
`process_stripe_event(event_id, event_type, user_id, subscription_fields)`
that uses one transaction to insert/claim the event and update the
subscription, or use an event table with
`processing`/`processed`/`failed`, lease expiry, and safe retries.
Ensure a duplicate event cannot block recovery from a prior partial
failure.

### 6.3 Stripe event and status mapping

Minimum event handling: - `checkout.session.completed`: verify
`mode = subscription`; use metadata/customer mapping; fetch subscription
and sync state. - `customer.subscription.created`: sync new subscription
state. - `customer.subscription.updated`: sync status, price, current
period end, and cancellation flags. - `customer.subscription.deleted`:
set plan to Free and status to canceled. - `invoice.payment_failed`:
sync the current subscription state and apply documented grace-period
policy. - Also consider `invoice.paid` / `invoice.payment_succeeded` to
restore active status after a successful retry.

Do not derive Pro access from a client-side `?checkout=success`
parameter. The billing page can display "Payment received; confirming
subscription..." until the webhook has updated the database.

**Price validation:** when syncing a subscription, verify its line item
contains the configured `STRIPE_PRO_PRICE_ID`. An unrelated Stripe
subscription must not grant Pro.

------------------------------------------------------------------------

## 7. Public Embed Architecture

### 7.1 Recommended design

Use an iframe as the rendering boundary. A tiny loader is optional; a
direct iframe is the simplest and safest MVP.

``` html
<iframe
  src="https://YOUR_APP_DOMAIN/embed/SPACE_UUID"
  title="Customer testimonials"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  sandbox="allow-scripts allow-same-origin"
  style="width:100%;min-height:360px;border:0;border-radius:12px;overflow:hidden"
></iframe>
```

If the page needs dynamic height, add a narrowly scoped `postMessage`
resize protocol: - iframe sends
`{ type: "testimonial-embed:resize", height: number }`; - parent
verifies `event.origin` equals the exact app origin and checks
`event.source` is the expected iframe window; - clamp height to sensible
bounds; - never use wildcard origins for privileged messages; - do not
allow arbitrary messages to trigger navigation or data requests.

For a cross-origin iframe, sandbox flags must be reviewed. Avoid
granting top-navigation, popups, downloads, or forms unless truly
required. Test the chosen flags with the actual embed page.

### 7.2 Public DTO and query

Create a server-only function that returns only:

``` ts
type PublicTestimonial = {
  id: string;
  name: string;
  company_name: string | null;
  profile_photo_url: string | null;
  content: string;
  rating: number | null;
  created_at: string;
};
```

Query only eligible rows:

``` ts
const { data, error } = await admin
  .from("testimonials")
  .select("id,name,company_name,profile_photo_url,content,rating,created_at")
  .eq("space_id", spaceId)
  .eq("share_consent", true)
  .eq("is_hidden", false)
  .order("is_favorite", { ascending: false })
  .order("created_at", { ascending: false })
  .limit(30);
```

Before this query, validate that the space exists and that requested
configuration is allowed. The service-role query must never select
`email`, `social_links`, or internal flags for public rendering. Do not
return full database rows and then filter in the browser.

### 7.3 Embed config validation

-   `layout`: enum `masonry | carousel`.
-   `dark_mode`, `animation_enabled`, `show_rating`: booleans.
-   `background_color`: strict hex color regex,
    e.g. `^#[0-9A-Fa-f]{6}$`.
-   Enforce a maximum number of testimonials and reasonable text/image
    dimensions.
-   Do not allow custom HTML or CSS input in MVP.
-   Animation defaults off and respects `prefers-reduced-motion`.
-   Live preview should use the same renderer/component as the real
    iframe to prevent preview/production drift.

------------------------------------------------------------------------

## 8. Inbox, Dashboard, and Data Handling

### 8.1 Inbox query rules

-   Always query through the user-scoped Supabase client and rely on RLS
    as a second boundary.
-   Paginate using range/cursor rather than loading the entire inbox.
-   Validate filter values; never interpolate raw strings into SQL.
-   Search name/content with a safe parameterized query or a controlled
    RPC. Escape wildcard characters if `%` and `_` should be literal.
-   For mutation actions, select the testimonial and its space ownership
    server-side before updating.
-   Do not accept `owner_id` from the client. Derive owner identity from
    the verified session.
-   Treat edit as an audited owner correction: preserve `created_at`,
    update `updated_at`, and never change the original consent to true
    automatically. If content changes materially, consider asking for
    renewed consent before public display.

### 8.2 Analytics

-   Use database counts/aggregates or a dedicated RPC. Avoid downloading
    every testimonial just to count it.
-   Daily graph should include zero-count days for the selected period.
-   Use UTC timestamps in storage and consistently defined date
    boundaries. Convert for display in the user's locale.
-   Distinct submitters should count `email_normalized` for the owner's
    spaces within the selected range if the metric is range-filtered.
-   Handle no spaces/no submissions without a broken chart.

### 8.3 Profile photo uploads

-   Validate MIME type and file signature where possible; do not trust
    file extension alone.
-   Set a small size limit (e.g. 2 MB) and permit only JPEG, PNG, or
    WebP.
-   Generate a random object path; do not use user-provided filenames as
    paths.
-   Use a dedicated Storage bucket with safe policies. If public avatars
    are needed, only make the image objects public---not private
    testimonial fields.
-   Remove abandoned uploads if submission fails, or use a cleanup task.
-   Never allow arbitrary external image URLs to be injected into the
    public embed.

------------------------------------------------------------------------

## 9. Rate Limiting and Spam Controls

Implement a distributed rate limiter in production (managed Redis/KV is
preferable). An in-memory Map is not reliable on serverless deployments.

Suggested starting policy, tune after observing legitimate use: - Per IP
hash: 10 submission attempts per 10 minutes. - Per space: 30 attempts
per 10 minutes. - Per IP hash + space: 5 successful submissions per 10
minutes. - Per account: reasonable cap on Checkout session creation. -
Request body cap: 16 KB for text submissions, excluding separately
uploaded photo bytes. - Add honeypot field and reject submissions where
it is populated. - Add CAPTCHA only if abuse justifies the friction. -
Return `429` with a retry message; do not reveal rate-limit internals. -
Hash IP with a server-side rotating secret before using it as a
rate-limit key; avoid indefinite raw-IP storage. - Add security logging
without logging testimonial content, email, tokens, or payment data.

------------------------------------------------------------------------

## 10. Testing and QA Strategy

### 10.1 Required scripts

Add scripts similar to these and adapt to the generated project:

``` json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

### 10.2 Test layers

**Unit tests** - Zod validation for space fields and dynamic submission
fields. - Plan mapping and limit calculations. - Slug generation and
collision retry. - Consent timestamp mapping. - Embed config validation
and public DTO allowlist. - Stripe status/price mapping.

**Integration tests** - Create space at limit and beyond limit. - Public
submission with each field configuration. - Rating enabled/disabled. -
Atomic per-space cap under concurrent submissions. - Owner mutations
only affect their own testimonials. - Embed query excludes
hidden/unconsented testimonials. - Duplicate Stripe event handling and
failed event recovery.

**RLS tests** Use two users, A and B, plus unauthenticated anon: 1. A
can read/update A's spaces. 2. A cannot select/update/delete B's spaces.
3. A cannot access B's testimonials through direct query or guessed
UUID. 4. A cannot modify subscription plan/status. 5. Anon cannot list
testimonials, profiles, or subscriptions. 6. Anon cannot insert
testimonials directly through Supabase REST. 7. Public submission
endpoint accepts valid submissions only and never returns private data.
8. Webhook events are not readable/writable by normal users.

Run tests against a local Supabase instance where possible, using
separate user sessions and the anon key. Do not test only as service
role; service role bypasses RLS and can hide policy defects.

### 10.3 Stripe CLI local testing

Install and authenticate the Stripe CLI, then start the local app:

``` bash
npm run dev
```

In another terminal:

``` bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a webhook signing secret beginning with `whsec_`. Put
that exact local secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`,
then restart the app. Do not use the local CLI secret in production.

Trigger sample events:

``` bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

Fixtures may not contain your real application metadata or
subscription/price relationships. Therefore: - Use `stripe trigger` to
verify signature handling and basic event routing. - For end-to-end
association tests, create a test-mode Checkout session from the app and
complete it using Stripe's test card details from Stripe's current
documentation. - Verify the webhook log, database subscription row, and
Billing UI after each event. - Send the same event twice and confirm no
duplicate side effects. - Send an invalid signature and confirm a 400
response with no database changes. - Test out-of-order events and failed
database writes. Ensure retries recover.

Never log full webhook payloads in production. Log event ID/type and
safe processing status only.

### 10.4 Manual edge-state checklist

-   No spaces, no testimonials, no embeds, no billing history.
-   Loading and error boundaries on each primary route.
-   Expired session during mutation.
-   Invalid/expired public slug.
-   Disabled required field configuration.
-   Rating omitted, null, out of range, or submitted when disabled.
-   Consent false and true.
-   Oversized payload and unsupported image type.
-   Duplicate submit click, page refresh after success.
-   Two simultaneous submissions at the plan cap.
-   Free plan at limit; Pro plan; canceled plan; failed payment.
-   Stripe redirect success before webhook arrives.
-   Hidden testimonial later shown; consent revoked/changed; embed
    reflects current state.
-   Cross-owner ID guessing.
-   XSS text such as `<script>alert(1)</script>` renders as plain text.
-   Mobile widths, keyboard navigation, focus states, reduced motion,
    and screen-reader labels.

### 10.5 Security review before launch

-   Search codebase for `SUPABASE_SERVICE_ROLE_KEY`,
    `STRIPE_SECRET_KEY`, and accidental `NEXT_PUBLIC_` prefixes.
-   Confirm privileged modules import `server-only`.
-   Review every route handler/server action for authentication,
    authorization, validation, and safe errors.
-   Confirm RLS is enabled on all user-data tables.
-   Confirm there are no broad anon `SELECT` policies on private tables.
-   Confirm all public display queries filter `share_consent = true` and
    `is_hidden = false`.
-   Confirm public DTOs are allowlists.
-   Confirm Stripe signature verification uses the raw body.
-   Confirm webhook processing is retry-safe and atomic enough for
    production.
-   Confirm limits are enforced atomically, not only with a UI count.
-   Review data retention, privacy policy, terms, and consent language
    before public launch.

------------------------------------------------------------------------

## 11. Deployment to Vercel

### 11.1 Before deployment

1.  Create separate Supabase development and production projects.
2.  Apply migrations to development and verify them.
3.  Configure Supabase Auth redirect URLs for localhost and the
    production domain.
4.  Create a Stripe test-mode product and recurring monthly \$9.99 USD
    Price. Put its Price ID in `STRIPE_PRO_PRICE_ID`.
5.  Configure the local Stripe CLI webhook secret for local testing.
6.  Add automated checks to CI: lint, typecheck, unit tests, build.
7.  Ensure `.env.local`, service keys, and Stripe secrets are in
    `.gitignore`.

### 11.2 Vercel steps

1.  Push the repository to a private or public Git provider.
2.  Import the project into Vercel.
3.  Set the production environment variables listed below in Vercel
    Project Settings.
4.  Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.
5.  Deploy a preview environment first and run smoke tests.
6.  Apply database migrations to the production Supabase project using
    the CLI/deployment process. Do not rely on manually editing the
    production database.
7.  In Stripe Dashboard, create a **live-mode** webhook endpoint at
    `https://YOUR_DOMAIN/api/stripe/webhook`.
8.  Subscribe to:
    -   `checkout.session.completed`
    -   `customer.subscription.created`
    -   `customer.subscription.updated`
    -   `customer.subscription.deleted`
    -   `invoice.payment_failed`
    -   `invoice.paid` or `invoice.payment_succeeded` if used for
        recovery
9.  Copy the production webhook signing secret into Vercel as
    `STRIPE_WEBHOOK_SECRET`.
10. Use the live Price ID in production only after end-to-end test-mode
    validation.
11. Configure the production domain in Supabase Auth redirect URLs.
12. Redeploy after environment changes; verify that the correct
    variables are assigned to Production, Preview, and Development
    environments.

### 11.3 Production environment checklist

Required:

-   `NEXT_PUBLIC_APP_URL`
-   `NEXT_PUBLIC_SUPABASE_URL`
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
-   `SUPABASE_SERVICE_ROLE_KEY` (server-only; only if privileged
    operations are used)
-   `STRIPE_SECRET_KEY`
-   `STRIPE_WEBHOOK_SECRET`
-   `STRIPE_PRO_PRICE_ID`

Optional if using distributed rate limiting:

-   `UPSTASH_REDIS_REST_URL`
-   `UPSTASH_REDIS_REST_TOKEN`

Never reuse development webhook secrets or test-mode Price IDs in
production. Avoid placing secrets in build logs, screenshots, AI
prompts, or client-visible diagnostics.

### 11.4 Smoke tests after deployment

-   Register a new test account.
-   Create a space and copy its public URL.
-   Submit a testimonial in a private/incognito browser.
-   Verify the inbox and dashboard update.
-   Confirm the testimonial is not public without consent.
-   Give consent, keep it visible, and confirm the embed displays it.
-   Hide it and confirm the embed removes it.
-   Test Free limits.
-   Complete a Stripe test-mode Checkout in a preview environment and
    verify webhook state.
-   Check logs for unexpected 4xx/5xx responses without exposing
    personal data.
-   Test from a mobile device and a separate external test website for
    the iframe.

------------------------------------------------------------------------

## 12. Suggested Build Order and Definition of Done

Do not begin the next phase until the current phase meets its definition
of done.

  -----------------------------------------------------------------------
  Phase                               Definition of done
  ----------------------------------- -----------------------------------
  Foundation                          Auth, migrations, RLS, protected
                                      shell, `.env.example`, setup docs

  Spaces                              Create/list/edit, configuration
                                      validation, slug, plan limit, copy
                                      link

  Submissions                         Public form, consent, dynamic
                                      validation, anti-spam, atomic cap

  Inbox                               Search/filter/pagination, edit,
                                      favorite, Wall of Love, hide,
                                      delete

  Dashboard                           Real metrics, date filters, daily
                                      chart, usage and upgrade CTA

  Embeds                              Live preview, two layouts, theme
                                      options, safe iframe/public DTO

  Billing                             Checkout, verified/idempotent
                                      webhooks, current plan, portal if
                                      included

  Hardening                           Security review, tests, build,
                                      deployment docs, smoke tests
  -----------------------------------------------------------------------

### Final release gate

Release only when: - `npm run lint`, `npm run typecheck`, `npm test`,
and `npm run build` pass. - RLS tests prove cross-owner isolation. -
Limit enforcement is server-side and safe under concurrent requests. -
Public endpoints expose only intended data. - Stripe webhook
verification, idempotency, retries, and subscription reconciliation are
tested. - The deployed environment has correct secrets and Stripe
mode/Price ID. - Privacy/consent copy, terms, and a contact/support
route are present.

------------------------------------------------------------------------

## 13. Working Effectively With a Free-Tier AI Coding Agent

1.  Keep this file in the repository as `IMPLEMENTATION_GUIDE.md`.
2.  Paste only the current phase prompt, not all eight prompts at once.
3.  Ask the agent to inspect existing files before changing them and to
    summarize the plan before editing.
4.  Require small, reviewable changes. Avoid unrelated refactors.
5.  After each phase, inspect `git diff`, run tests, and commit a
    known-good state.
6.  Ask the agent to list assumptions and unresolved TODOs; do not
    accept "production-ready" claims without evidence.
7.  Never paste real API keys, customer data, or production secrets into
    prompts.
8.  If context or usage runs low, start a fresh session and provide this
    guide plus the current phase, completed phases, failing tests, and
    `git status`.
9.  Prefer fixing one failing test at a time rather than asking the
    agent to rewrite the whole app.
10. Keep a short `IMPLEMENTATION_STATUS.md` with completed phase,
    current blockers, commands run, and next task.

### Recommended first instruction

``` text
Read IMPLEMENTATION_GUIDE.md and inspect the repository. Do not implement the
whole application. First report the existing project state and a short plan for
Phase 1 only. Then implement Phase 1, run lint/typecheck/tests/build, and report
the exact results and any unresolved issues. Follow the guide's security rules.
```

------------------------------------------------------------------------

## 14. Official Documentation to Keep Nearby

Use current official docs when verifying APIs and version-specific
details:

-   Next.js App Router: https://nextjs.org/docs/app
-   Supabase Auth with Next.js:
    https://supabase.com/docs/guides/auth/server-side/nextjs
-   Supabase Row Level Security:
    https://supabase.com/docs/guides/database/postgres/row-level-security
-   Supabase CLI and migrations: https://supabase.com/docs/guides/cli
-   Stripe Checkout subscriptions:
    https://docs.stripe.com/billing/subscriptions/checkout
-   Stripe webhooks: https://docs.stripe.com/webhooks
-   Stripe CLI: https://docs.stripe.com/stripe-cli
-   Vercel environment variables:
    https://vercel.com/docs/projects/environment-variables

**Important:** Framework and Stripe SDK object shapes can change.
Compile and test the code against the installed SDK versions. The
snippets in this guide are implementation skeletons; complete the
explicitly marked transaction, idempotency, and error-handling
requirements before production deployment.
