# PRD: Minimal Testimonial Collection SaaS

**Working name:** Testimonial Hub\
**Document status:** MVP specification, updated to reflect the implemented
product (see section 19 for the requirement-to-implementation status)\
**Purpose:** Build a minimal SaaS inspired by Testimonial.to that lets
businesses collect, manage, and embed customer testimonials.

## 1. Product Goal

Let a user create a public testimonial collection page ("space"), share
it with customers, manage submitted testimonials, and display approved
testimonials on an external website. Support a free plan and one paid
subscription.

## 1a. Billing decision: DEMO subscription (no payment gateway)

This version does **not** integrate Stripe or any payment gateway. Real
payment processing must not be added unless the product owner explicitly
asks for it.

-   Free and Pro limits, the $9.99/month illustrative price, and the plan
    comparison are unchanged.
-   **Upgrade** opens a clearly labelled demo checkout page (no payment fields).
    Confirming persists a database-backed *demo* subscription; Cancel leaves the
    plan unchanged; "Switch back to Free" resets it. Downgrading keeps all data
    and enforces Free limits only on new spaces/testimonials.
-   `subscriptions` stores `plan`, `status`, `billing_mode` (`none` or `demo`) and
    `demo_upgraded_at`. A CHECK constraint makes Pro possible only as an active
    demo subscription. Clients cannot write the table; `set_demo_plan()` (security
    definer, keyed on `auth.uid()`) is the only write path and is idempotent.
-   Limits are enforced by database triggers with advisory locks (race-free), not
    only in the UI.
-   The UI and copy must never claim a payment was processed.

## 2. Users and Core Flows

-   **Space owner:** creates an account, configures spaces, reviews and
    manages submissions, curates a Wall of Love, creates embeds, and
    manages the (demo) plan.
-   **Customer/testimonial submitter:** opens a public link and submits
    a testimonial without an account.
-   **Visitor:** sees the owner's Wall of Love on the owner's website
    (embed) or on the public Wall of Love page.

Primary flow: Sign up → create space → copy public link → receive
testimonials → heart the best into the Wall of Love → design and embed
the widget → upgrade (demo) if needed.

## 3. Stack

-   **App:** Next.js (App Router) + TypeScript
-   **UI:** Tailwind CSS v4 with design tokens and a small set of reusable
    primitives (`src/components/ui/`)
-   **Database and authentication:** Supabase (PostgreSQL + Auth)
-   **File uploads:** Supabase Storage (`profile-photos` bucket) for
    profile photos
-   **Billing:** database-backed demo subscription (no payment processor)
-   **Hosting:** Vercel or another Next.js-compatible host

Use environment variables for all secrets. Never expose the service-role
key to the browser. If the developer chooses a different stack, preserve
the requirements and data model below.

## 4. Scope

### In scope

-   Email/password account registration, login, logout, and protected
    owner routes
-   Dashboard and basic collection analytics
-   Space creation, configuration, editing, and deletion
-   Public, no-login testimonial submission (with optional photo upload)
-   Testimonial inbox and management actions
-   Wall of Love curation, public Wall of Love page, and favorites
-   Embed widgets (five types) with live preview and copyable embed code
-   Free and paid plan limits with a demo upgrade flow
-   Responsive desktop/mobile layouts, loading states, empty states,
    error messages, light and dark mode

### Out of scope for MVP

-   Video testimonials or video recording
-   Team accounts and roles
-   Real payments, Stripe, webhooks, invoices
-   Custom domains, advanced integrations, automated email campaigns
-   Multiple paid tiers, coupons, annual billing, and complex tax
    handling
-   Public search/discovery of spaces
-   Password reset, email-change and account-deletion screens

## 5. Authentication and Navigation

-   Anyone can register and log in.
-   Only authenticated owners can access their dashboard, spaces, inbox,
    embed widgets, and billing.
-   Customers submitting testimonials must not need an account.
-   Owner navigation is space-centric:
    -   **Workspace sidebar:** Home, All testimonials, Billing, and the
        list of spaces. The current space expands to show its sections.
        On mobile the sidebar is a slide-out drawer.
    -   **Inside a space (tabs):** Overview, Inbox, Wall of Love, Embed
        widgets, Settings.
-   Old URLs (`/wall-of-love`, `/embeds`, `/embeds/<id>`,
    `/spaces/<id>/edit`) redirect to the space pages.
-   Ensure each owner can access only their own spaces and testimonials.

## 6. Spaces

A space is a public page used to collect testimonials.

### Space creation fields

-   **Title:** required
-   **Subtitle:** optional
-   **Prompt / "What should customers talk about?":** required
-   **Collect rating:** on/off; default on
-   **Theme:** choose from 3 predefined themes (light, warm, dark)
-   **Fields:** configure which submitter fields appear and whether each
    is required

### Fields

-   Name --- enabled and required by default
-   Email address --- enabled and required by default
-   Company name --- optional predefined field
-   Social links --- optional predefined field
-   Profile photo --- optional predefined field (uploaded file)

Owners can enable/disable optional fields and toggle required status for
enabled fields. Name and email are required by default and cannot be
turned off. Store the field configuration as structured data and
validate submissions against the current configuration on the server.

After successful creation, show a success screen with the public URL and
a **Copy link** action. Owners can later edit space settings. Public
URLs use a unique, collision-checked slug.

### Deleting a space

-   Space → Settings → **Delete space** (also reachable from the trash
    icon on the Spaces list).
-   Requires typing the space name to confirm.
-   Permanently removes the space, its testimonials, its embed design,
    and its uploaded photos; the public page, Wall of Love page and
    embeds stop working immediately.
-   Only the owner can delete; deleting a missing or foreign space
    reports "no longer exists" and removes nothing.

## 7. Public Testimonial Submission

-   Public page displays the space title, subtitle, prompt, selected
    theme, configured fields, and rating input if enabled.
-   Validate required fields both in the browser and on the server.
-   Include a consent checkbox asking whether the owner may share the
    testimonial publicly/on social networks. It must be unchecked by
    default.
-   Clearly distinguish consent to share from submitting the
    testimonial. Store consent and its timestamp with the submission.
-   Prevent spam with rate limiting, a honeypot field, and server-side
    validation. Do not require login.
-   Enforce the space's testimonial limit before accepting a submission
    (authoritatively in the database).
-   Profile photo: JPG/PNG/WebP up to 2 MB, uploaded through a rate
    limited endpoint that detects the file type from its bytes. A
    submission only accepts photo URLs that point to a file uploaded for
    that same space.
-   After success, show a friendly confirmation message; the page must
    still work if media fails to load.
-   Show a clear success state and avoid accidental duplicate
    submissions on refresh.

## 8. Dashboard and Analytics

Show: total testimonials received; number of distinct submitters, using
normalized email as the MVP identifier; number of spaces and remaining
space allowance; testimonials collected over time as a daily chart;
date-range filters (7 days, 30 days, 90 days, all time); a free-plan
upgrade banner with a clear CTA (hidden for Pro); usage indicators for
spaces and testimonials per space (Billing page).

Each space also has an **Overview** with its own stats (testimonials,
Wall of Love picks, last 7 days, average rating), the share link and the
question asked.

Analytics must be derived from stored data, not hardcoded. Empty states
should explain how to collect the first testimonial.

## 9. Inbox and Testimonial Management

-   List testimonials with avatar, submitter name, company, submission
    date, rating (if collected), consent/visibility status, and
    favorite/Wall of Love status.
-   Available globally ("All testimonials") and per space.
-   Tabs: **All, Wall of Love, Favorites, Hidden**. Search by name,
    company or text; filters for space, rating and date range;
    pagination that keeps the active filters.
-   Actions per testimonial:
    -   **Heart / Add to Wall of Love:** the primary action; controls
        whether it appears in the Wall of Love (and therefore the embed
        and public page).
    -   **Favorite / Unfavorite:** prioritises favorites at the top of
        owner-facing lists and the widgets.
    -   **Edit:** owner can correct the testimonial text, rating and
        company; consent, email, space and creation time are immutable.
    -   **Hide / Show:** hidden testimonials never appear in public
        embeds or public Wall of Love views.
    -   **Delete:** requires confirmation; removes the testimonial from
        app views and public embeds.
    -   **More actions:** an ellipsis menu holds favorite, hide/show,
        edit and delete.
-   Favorite and Wall of Love are separate states.
-   Do not display testimonials publicly unless the owner has made them
    visible. Respect the submitter's sharing consent in any
    public-facing display.

## 10. Wall of Love

-   The Wall of Love is the set of testimonials the owner hearts. It is
    **per space**.
-   Owner page (Space → Wall of Love): a live preview of exactly what
    visitors see, buttons to customise the design, open and copy the
    public page, a notice when curated items are withheld (hidden or no
    consent), and the list of curated testimonials to manage.
-   Sort favorites first, then newest first.
-   Only visible testimonials with sharing consent that are on the Wall
    of Love appear in public-facing views.
-   **Public page:** `/wall/<spaceId>` renders the same widget with the
    saved design, the space title and subtitle.
-   Useful empty states link to the inbox.

## 11. Embed Widgets

Owners design an embed for the Wall of Love of a selected space.

### Options

-   Widget type: **Wall of Love grid (masonry)**, **Carousel**,
    **Marquee** (auto-scrolling), **Single** (featured testimonial) and
    **Rating badge** (average stars and count)
-   Dark cards: on/off
-   Background colour: colour input or preset palette
-   Hover animation: on/off; default off for accessibility and performance
-   Star-rating display when rating data exists

### Requirements

-   Show a live preview (desktop/mobile toggle) that updates when options
    change, including unsaved changes.
-   Generate copyable embed code: a small JavaScript loader (`/embed.js`)
    that injects a sandboxed, auto-resizing iframe, plus an iframe-only
    fallback. Copying must work on non-HTTPS origins.
-   The embed and the public page render the testimonials the owner added
    to the Wall of Love for the selected space (only if visible and
    consent-eligible), using the **saved** design, and adapt to the host
    page width.
-   Include loading, empty, and error states. The embed must not expose
    emails, private owner data or hidden testimonials.
-   Validate embed configuration on the server (allowlisted widget types,
    hex colours); do not trust client-supplied testimonial IDs.
-   Respect reduced-motion preferences (the marquee becomes static) and
    avoid autoplay audio or disruptive animation.

## 12. Plans, Limits, and Billing (demo)

Assume the paid plan is **\$9.99 USD per month**, illustrative only.

  Feature                    Free            Pro
  ------------------------ ------ --------------
  Price                       \$0   \$9.99/month
  Spaces                        3             25
  Testimonials per space      100          1,000

-   Show both plans on the Billing page, with current-plan status and
    usage (spaces and testimonials per space).
-   Free users see an upgrade banner in the dashboard and upgrade CTAs
    when they reach a limit.
-   Before creating a space or accepting a submission, enforce the
    relevant limit on the server and in the database, and show a helpful
    message when reached.
-   **Upgrade** opens a demo checkout page (no card fields, "due today
    $0.00"). Confirm persists the demo Pro plan; Cancel changes nothing.
-   The plan persists across refresh, logout and login. "Switch back to
    Free" resets the demo state.
-   If the account returns to Free, existing data is kept; new spaces and
    submissions beyond Free limits are blocked and the restriction is
    explained.
-   Users can change only their own plan; the UI never claims a payment
    was processed.

## 13. Data Model

Use UUID primary keys and timestamps.

-   **profiles:** `id` (matches auth user), `display_name`, `created_at`
-   **subscriptions:** `user_id`, `plan` (`free`|`pro`), `status`
    (`free`|`active`), `billing_mode` (`none`|`demo`), `demo_upgraded_at`,
    `created_at`, `updated_at`
-   **spaces:** `id`, `owner_id`, `title`, `subtitle`, `prompt`, `slug`,
    `collect_rating`, `theme`, `field_config` (JSON), `created_at`,
    `updated_at`
-   **testimonials:** `id`, `space_id`, `name`, `email`, `company_name`,
    `social_links` (JSON), `profile_photo_url`, `content`, `rating`
    (nullable), `share_consent`, `consent_at`, `is_favorite`,
    `on_wall_of_love`, `is_hidden`, `created_at`, `updated_at`
-   **embed_configs:** `id`, `space_id`, `owner_id`, `layout`
    (`masonry`|`carousel`|`marquee`|`single`|`badge`), `dark_mode`,
    `background_color`, `animation_enabled`, `show_rating`, `created_at`,
    `updated_at` (one saved design per space)
-   **Storage bucket `profile-photos`:** public read, server-only writes
-   **Database functions/triggers:** `set_demo_plan()`, `is_pro()`,
    concurrency-safe space/testimonial limit triggers, immutable-column
    trigger on testimonials, signup trigger creating the profile and Free
    subscription

Indexes cover owner IDs, space IDs, slugs, submission dates, and common
inbox filters. Row Level Security scopes owners to their own data; public
submission and embed endpoints expose only the minimum required fields.

## 14. Security, Privacy, and Reliability

-   Enforce authorization and plan limits on the server and in the
    database, not only in the UI.
-   Use database row-level security on all user-owned and billing tables.
-   Validate and sanitize all user input with Zod; render testimonial
    content as text, not executable HTML.
-   Restrict profile-photo uploads by detected file type and size; use
    safe storage URLs; reject SVG/HTML.
-   Do not expose submitter emails or private fields in public embeds or
    pages.
-   Public display requires visible status, sharing consent, and (for
    widgets) being on the Wall of Love.
-   Consent, email, space and creation time of a submission are
    immutable.
-   Provide confirmation for destructive actions and useful, safe error
    messages (no raw database text).
-   Store secrets in environment variables and document required
    variables in `.env.example` (placeholders only).

## 15. UX and Visual Direction

-   Light, clean, minimal SaaS interface in the spirit of Testimonial.to:
    left sidebar, card-based inbox with a heart as the primary action,
    two-pane embed designer, one accent colour, soft borders and
    shadows. Dark mode is available from a toggle (light is the default).
-   Design tokens in `src/app/globals.css`; reusable primitives (button,
    card, badge, avatar, star rating, stat card, empty state, page
    header).
-   Responsive layouts, accessible labels, keyboard-operable controls,
    and visible focus states; respect `prefers-reduced-motion`.
-   Include loading, empty, success, and error states for all main
    flows.

## 16. Acceptance Criteria

The MVP is ready when:

1.  A new user can register, log in, and log out.
2.  An owner can create up to 3 Free spaces and copy each public link.
3.  A customer can submit a testimonial without an account, using the
    configured fields and consent checkbox.
4.  Required fields, optional rating, theme, and space limits are
    enforced server-side.
5.  The owner can see dashboard metrics and a date-filtered daily chart
    based on real data.
6.  The inbox supports viewing, searching/filtering, favoriting, Wall of
    Love, editing, hiding/showing, and deleting testimonials; spaces can
    be deleted.
7.  Public embeds and the public Wall of Love page render only
    Wall-of-Love, visible, consent-eligible testimonials and support the
    five widget types and the listed display options.
8.  Free and Pro limits are enforced consistently, including under
    simultaneous requests.
9.  The demo upgrade persists the Pro plan across refresh and
    logout/login, Cancel leaves the plan unchanged, and switching back to
    Free keeps data and restores Free limits.
10. Owners cannot access another owner's data, and public endpoints do
    not reveal private submission fields.

## 17. Implementation Plan

Phases (all complete; Phase 7 was replaced by demo billing):

1.  **Foundation:** project setup, environment validation, database
    schema, auth, protected routes, and shared UI.
2.  **Spaces:** create/list/edit/delete spaces, field configuration,
    theme selection, public link.
3.  **Submissions:** public form, server validation, consent, photo
    upload, success screen, spam protection.
4.  **Inbox and Wall of Love:** list, filters, heart, favorite, edit,
    hide/show, delete.
5.  **Dashboard:** metrics, date filters, chart, usage indicators,
    upgrade banner.
6.  **Embeds:** widget types, live preview, generated snippet, public
    rendering endpoint, public Wall of Love page.
7.  **Billing (demo):** plans, server-side and database limits, demo
    checkout, billing status. *(Stripe was removed by decision.)*
8.  **Hardening and UI overhaul:** access-control and limit tests,
    responsive/accessibility checks, space-centric light redesign,
    deployment documentation.

For each phase: implement, run lint/type checks and relevant tests, fix
issues, then proceed. Keep setup instructions and `.env.example`
current.

## 18. Decisions and Assumptions

-   Pro is a **demo** plan at an illustrative \$9.99 USD/month; no
    payment gateway.
-   Name and email are required by default; optional fields are
    configurable.
-   A testimonial is publicly displayable only when it is visible and
    the submitter has consented to sharing; widgets additionally require
    it to be on the Wall of Love.
-   Every stored testimonial (hidden or not) counts toward the per-space
    limit.
-   "Distinct submitters" means unique normalized email addresses.
-   If a plan is downgraded, retain existing content but enforce Free
    limits on new spaces and submissions.
-   Theme and embed options are predefined; custom CSS and advanced
    customization are not part of the MVP.
-   One saved embed design per space (it drives both the embed and the
    public Wall of Love page).
-   The Single widget shows the top testimonial (favorites first); there
    is no per-widget hand-picking beyond the Wall of Love heart.
-   Rate limiting is in memory per server instance (best effort).

## 19. Implementation Status

Status key: **Verified** = exercised against a real Supabase project with
throwaway accounts (and unit tests where noted); **Unit** = covered by
automated tests only; **Open** = known gap or manual step.

### Requirements

| Area | Status |
|---|---|
| Auth: register, login, logout, protected routes | Verified (login/logout flow and redirects) |
| Spaces: create, edit, list, public link, delete | Verified (delete incl. cascade and photo cleanup); create/edit Unit |
| Public submission, consent, validation, honeypot, rate limit | Verified |
| Profile photo upload and owned-URL enforcement | Verified |
| Inbox: tabs, search, filters, heart, favorite, hide, edit, delete | Verified (queries, filters, isolation); button interactions Unit/visual |
| Wall of Love curation and public page | Verified |
| Embed widgets: 5 types, designer, loader, auto-resize | Verified (all types rendered; loader resize in headless Edge); saving the new types needs migration `0005` |
| Dashboard metrics and chart | Verified (renders with real data) |
| Demo billing: upgrade, cancel, persistence, downgrade | Verified |
| Free/Pro limits under simultaneous requests | Verified (exact caps) |
| RLS isolation between accounts | Verified |
| Immutable consent/email/space/created_at | Verified |
| Light/dark, responsive, mobile drawer | Visual review (desktop and phone widths) |

### Billing checklist

-   [x] Stripe SDK, webhook route, env vars and Stripe tests removed
-   [x] Migration `0003`: demo billing model, `set_demo_plan()`, locked limit triggers
-   [x] Billing page: plan comparison, usage per space, demo labelling, switch to Free
-   [x] Demo checkout page (`/billing/upgrade`) with confirm and cancel
-   [x] Plan badge in the sidebar; dashboard banner hidden for Pro
-   [x] Tests for `resolvePlan` and the billing server actions
-   [x] Migrations `0003`, `0004` and `0005` applied to the development database and verified

### Open items

-   [ ] Apply migrations `0004` and `0005` in every other environment you deploy to
-   [ ] Replace the in-memory rate limiter with a shared store before running multiple server instances
-   [ ] Password reset, change email, delete account (out of scope for this MVP)
-   [ ] Manual cross-browser click-through and a test of the embed on a deployed third-party site
