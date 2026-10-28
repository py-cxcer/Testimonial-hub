# Testimonial Hub

Testimonial Hub is a minimal testimonial-collection SaaS in the spirit of Testimonial.to. Create a **space**, share its public link, collect testimonials from customers (no account needed), curate your favorites into a **Wall of Love**, and show them on any website with an embeddable widget or a public page.

> **Billing is a demo.** There is no payment gateway (no Stripe). The Pro plan is a simulated subscription stored in the database so the freemium model can be demonstrated end to end. Nothing is ever charged.

## Features

- **Spaces:** custom prompt, optional star rating, 3 themes, configurable form fields, unguessable public link, edit and delete.
- **Public collection page** (`/s/<slug>`): no login, server-side validation, explicit consent checkbox (unchecked by default), optional profile-photo upload, rate limiting and honeypot spam guard.
- **Inbox:** search, tabs (All / Wall of Love / Favorites / Hidden), filters (rating, date, space), favorite, hide, edit, delete.
- **Wall of Love:** the heart button adds a testimonial to the Wall. The embed and the public page show exactly those testimonials (and only if consented and not hidden).
- **Embed widgets:** five widget types, live preview, copyable code, auto-resizing loader.
- **Dashboard:** totals, distinct submitters, submissions chart with date ranges, plan and usage.
- **Demo billing:** Free vs Pro limits, demo upgrade/cancel/reset, enforced by the database.
- **Light and dark mode**, responsive layout with a mobile drawer.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions, TypeScript)
- **Database, Auth and Storage:** Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Styling:** Tailwind CSS v4 with design tokens in `src/app/globals.css`
- **Validation:** Zod
- **Testing:** Vitest, Testing Library, JSDOM
- **Billing:** demo subscription service (database-backed, no payment processor)

---

## Local Development Setup

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- npm `10+` or `11+`
- A Supabase project (or the local Supabase CLI)

### 2. Install dependencies
```bash
npm install
```

### 3. Environment variables
Copy `.env.example` to `.env.local` (never commit `.env.local`):
```bash
cp .env.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL used to build share links (default `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key (safe for the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. **Server-only. Never expose it or commit it.** |

No billing-related variables are needed.

### 4. Database setup and migrations
Apply **all** migrations, in order. Migrations are the source of truth for the schema:
```bash
supabase db push
# Or run each file in supabase/migrations/ in order in the Supabase SQL editor:
#   0001_initial_schema.sql
#   0002_enforce_plan_limits.sql
#   0003_demo_billing_and_hardening.sql
#   0004_profile_photo_bucket.sql
#   0005_widget_types.sql
```

| Migration | What it does |
|---|---|
| `0001` | Tables, indexes, triggers, signup trigger (profile + Free subscription) and Row Level Security policies |
| `0002` | First version of the plan-limit triggers |
| `0003` | **Demo billing:** `billing_mode` / `demo_upgraded_at` on `subscriptions`; removes the Stripe columns and `stripe_webhook_events`; adds `set_demo_plan()` (the only way a signed-in user can change their own plan); makes limit triggers concurrency-safe with advisory locks; blocks owners from rewriting a testimonial's consent, email, space or creation time; backfills missing profile/subscription rows |
| `0004` | Creates the public `profile-photos` Storage bucket (2 MB limit, JPG/PNG/WebP). Objects are written only by the server; clients cannot upload, overwrite or list them |
| `0005` | Adds the `marquee`, `single` and `badge` widget types to the `embed_layout` enum. Until applied, saving one of those types shows a clear "run migration 0005" message; Grid and Carousel keep working and the designer preview works for every type |

### 5. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Troubleshooting

- **Odd Next.js errors in the browser** (for example `chunk.reason.enqueueModel is not a function`, or old code still running after an edit): do not run `npm run build` while `npm run dev` is running in the same folder; they share the `.next` directory. Stop the dev server, delete `.next`, run `npm run dev` again and hard-refresh (Ctrl+Shift+R).
- **Intermittent `fetch failed` / connect timeouts to Supabase:** the repo already forces a safe TLS curve in `next.config.ts`, `src/instrumentation.ts` and the Supabase clients. If it persists, check your network/VPN.
- **"Copy" buttons on a LAN address** (`http://192.168.x.x`): browsers disable the Clipboard API on non-HTTPS origins. The app falls back to a legacy copy method (`src/lib/clipboard.ts`), and shows a message if copying is impossible.

---

## App structure

**Space-centric navigation**

- **Workspace level** (sidebar): Home (dashboard), All testimonials, Billing, and your spaces. The space you are in expands to show its sections.
- **Space level** (tabs inside `/spaces/<id>`): Overview, Inbox, Wall of Love, Embed widgets, Settings.

| Route | Purpose |
|---|---|
| `/` , `/login`, `/signup` | Landing page and authentication |
| `/dashboard`, `/inbox`, `/billing`, `/billing/upgrade` | Workspace pages (signed in) |
| `/spaces`, `/spaces/new` | Spaces list and creation |
| `/spaces/<id>` , `/inbox`, `/wall-of-love`, `/embed`, `/settings` | One space (signed in, owner only) |
| `/s/<slug>` | **Public** collection page |
| `/wall/<spaceId>` | **Public** Wall of Love page (same widget and saved design as the embed) |
| `/embed/<spaceId>` | **Public** iframe widget |
| `/embed.js` | **Public** loader script |
| `/api/testimonials`, `/api/uploads/profile-photo` | **Public** submission and photo upload endpoints |

Old URLs (`/wall-of-love`, `/embeds`, `/embeds/<id>`, `/spaces/<id>/edit`) redirect to the new space pages.

**Code layout**

- `src/actions/` server actions (auth, spaces, testimonials, embeds, billing)
- `src/app/` routes (App Router); `src/components/` UI (`ui/` primitives, `nav/`, `embeds/`, `testimonials/`, ...)
- `src/lib/` shared logic: `plans.ts` (limits and entitlement), `embed-data.ts` (the single public query), `validation/` (Zod schemas), `supabase/` (SSR, browser and admin clients)
- `supabase/migrations/` schema; `tests/` and `src/**/*.test.ts` unit tests

---

## Wall of Love, widgets and photos

- **One source of truth:** testimonials you add to the **Wall of Love** (the heart in the Inbox) are exactly what the embed and public page show, styled with your saved design. A testimonial is public only when it is **on the Wall, consented, and not hidden**. That rule lives in one place (`getWallOfLoveTestimonials` in `src/lib/embed-data.ts`) and is applied again when building the public DTO, which never includes the email or moderation flags.
- **Widget types** (Space -> Embed widgets): Wall of Love grid, Carousel, Marquee (auto-scrolling, pauses on hover, static when the visitor prefers reduced motion), Single (featured testimonial), and Rating badge (average stars and count). Options: dark cards, background colour, star ratings, hover animation. The same saved design drives the embed and `/wall/<spaceId>`.
- **Embed code (recommended):**
  ```html
  <div data-testimonial-hub="SPACE_ID"></div>
  <script async src="https://YOUR_APP/embed.js"></script>
  ```
  `public/embed.js` injects a sandboxed iframe and resizes it to fit (the widget posts only its height). An iframe-only snippet is available for builders that strip scripts; it has a fixed height. The embed always uses the **saved** design; the designer preview also shows unsaved changes.
- **Profile photos** are uploaded through `/api/uploads/profile-photo` (rate limited; the file type is detected from the file's bytes; SVG/HTML rejected; max 2 MB; server-generated file names; only for spaces with the photo field enabled). A submission only accepts photo URLs that point to a file uploaded for that same space.
- **Deleting:** Space -> Settings -> Delete space (type the space name to confirm; also reachable from the trash icon on the Spaces list). It removes the space, its testimonials, its embed design and its uploaded photos. Single testimonials are deleted from the inbox "..." menu.

---

## Demo Billing

| | Free | Pro (demo) |
|---|---|---|
| Price shown | $0 | $9.99 / month (illustrative) |
| Spaces | 3 | 25 |
| Testimonials per space | 100 | 1,000 |

Flow: **Billing -> Upgrade to Pro -> demo checkout page -> Confirm demo upgrade.** The checkout page is labelled as a demo and collects no payment details. Cancel returns to Billing without changing the plan. **Switch back to Free** resets the demo state; existing spaces and testimonials are kept, but Free limits apply to new ones.

How it is enforced:
- `subscriptions.plan` / `status` / `billing_mode` live in the database; a `CHECK` constraint guarantees `pro` can only be an active **demo** subscription.
- Clients cannot write `subscriptions` (RLS has no write policy). Server actions call `set_demo_plan()`, which uses `auth.uid()`, so a user can only change their own plan, and repeating a call is idempotent.
- Limits are enforced by `BEFORE INSERT` triggers on `spaces` and `testimonials` that take a per-owner / per-space advisory lock, so simultaneous requests cannot exceed a limit. Server code only does a friendly pre-check.
- Every stored testimonial counts toward the per-space limit (hidden or not), so moderation cannot be used to bypass it.

---

## Verification and quality gates

```bash
npm run typecheck
npm run lint
npm run test      # 105 unit tests
npm run build
```

Beyond unit tests, the following were verified against a real Supabase project using throwaway accounts (deleted afterwards):

- Row Level Security isolation between two accounts (read, update, delete, insert-as-other-owner, anonymous access).
- Exact plan caps under simultaneous requests: Free 3 spaces / 100 testimonials, Pro 25 spaces.
- Consent, email, space and creation time cannot be changed by owners; client cannot edit its own subscription.
- Demo billing end to end through the real forms: upgrade, cancel, persistence across logout/login, downgrade with data kept.
- Public pages and the embed show only on-wall + consented + visible testimonials and never emails; design changes propagate to `/embed` and `/wall`.
- Photo upload rules, space deletion (including cascade and storage cleanup), and the copy-button fallback on a non-HTTPS address.
- Visual review in headless Edge at desktop and phone widths, in light and dark.

**Not covered by automation:** a full manual click-through of every screen in every browser, load testing, and the embed on a deployed third-party site.

---

## Production deployment (Vercel)

1. Push the repository to GitHub or GitLab and import it into Vercel.
2. Set environment variables: `NEXT_PUBLIC_APP_URL` (canonical domain), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only secret).
3. Apply all migrations (`0001` to `0005`) to the production database.
4. In Supabase Auth, add `https://YOUR_DOMAIN/auth/callback` to the redirect URLs.
5. Serve over HTTPS so `embed.js` and the embed iframe load on customers' sites.

> **Known limitation:** rate limiting for the public submission and upload endpoints is in memory per server instance. It is a best-effort spam guard; for multi-instance production use, replace it with a shared store (for example Redis).

---

## Architecture and security conventions

- **Server identity:** `getUser()` is used for all server-side identity checks.
- **Service role key:** kept server-only (`src/lib/supabase/admin.ts`), never in client code or bundles. Public pages and endpoints use it only through narrow, validated server code.
- **Row Level Security:** enabled on `profiles`, `subscriptions`, `spaces`, `testimonials` and `embed_configs`; policies scope everything to the authenticated owner and never trust a client-supplied `user_id`.
- **Plan entitlement:** one rule everywhere: Pro only when `plan = 'pro' and status = 'active'` (`resolvePlan()` in `src/lib/plans.ts`, `is_pro()` in SQL).
- **Public data protection:** emails and moderation state are never returned publicly. Public display requires `share_consent = true` and `is_hidden = false` (plus being on the Wall of Love for widgets), filtered on the server.
- **Input handling:** all public input is validated with Zod at the server boundary; testimonial text is rendered as text, never HTML; embed options are allowlisted; the embed runs in a sandboxed iframe.
- **Immutable submission data:** consent, email, space and creation time cannot be changed after submission (database trigger).
