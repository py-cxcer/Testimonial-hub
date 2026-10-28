# Testimonial Hub — AI Agent Project Instructions

## 1. Your role and working method

Act as the project's senior full-stack engineer. Implement the application incrementally, following `IMPLEMENTATION_GUIDE.md` as the detailed execution plan.

- Before coding, inspect the existing repository, `IMPLEMENTATION_GUIDE.md`, `README.md`, `package.json`, and current migrations. Do not assume the repository is empty.
- Work on one implementation phase or small, explicitly requested task at a time.
- First summarize the intended changes and files affected; then implement them.
- Do not rebuild working features or replace project architecture without a clear reason.
- After each task, run the relevant lint, type-check, tests, and build commands that are available. Fix failures caused by your changes.
- Report what changed, commands run, results, unresolved issues, and the exact next step.
- Do not claim a feature works unless you have verified it or clearly state that it remains unverified.
- If blocked by missing credentials, external account setup, or unavailable services, implement the safe integration boundary and document the manual step. Never invent credentials or pretend an external operation succeeded.

## 2. Source of truth and decision-making

Use this precedence order when instructions conflict:

1. Explicit instructions in the current user request.
2. This `AGENTS.md` for persistent project conventions.
3. `IMPLEMENTATION_GUIDE.md` for phase order and implementation detail.
4. Existing, verified project conventions and code.

Keep `IMPLEMENTATION_GUIDE.md` as the detailed implementation plan. Keep this file focused on rules that should apply to every task.

- Read the relevant guide section before starting each phase.
- If a requirement is ambiguous and materially affects security, billing, data integrity, or architecture, ask one concise question instead of silently guessing.
- For low-risk UI details, choose a simple, consistent default and record it.
- If you discover the guide conflicts with the actual installed SDK/API, verify the current installed version and adapt to it; document the deviation.
- Do not add unrelated features, dependencies, abstractions, or redesigns.

## 3. Required stack and architecture

Follow the stack specified in `IMPLEMENTATION_GUIDE.md` and the existing lockfile. Do not switch frameworks, database providers, package managers, or styling systems without explicit approval.

- Use Next.js App Router and TypeScript with strict typing.
- Keep server components/server-side code as the default; add client components only when browser interaction or client state requires them.
- Use the Supabase SSR-compatible client patterns for authenticated server and browser contexts.
- Keep privileged operations on the server. Never expose the Supabase service-role key, Stripe secret key, webhook secret, or other server secrets to client code.
- Validate untrusted input at the server boundary with Zod (or the guide's established validation pattern).
- Keep reusable UI, feature logic, data access, and validation schemas separated where appropriate; avoid unnecessary abstraction for a small MVP.
- Follow the repository's existing naming, formatting, and component conventions.

## 4. Product rules that must remain consistent

Testimonial Hub is a minimal testimonial-collection SaaS.

### Plans and limits

- Free plan: maximum 3 spaces and 100 testimonials per space.
- Paid plan: USD $9.99 per month, maximum 25 spaces and 1,000 testimonials per space.
- Enforce limits on the server/database boundary, not only by hiding or disabling UI controls.
- Count testimonials according to the guide's documented rule. Do not let hiding, favoriting, editing, or deleting accidentally bypass limits or corrupt statistics.
- Prevent concurrent requests from exceeding plan limits. Use an atomic database operation/transaction or another concurrency-safe approach described in the guide.
- Never grant a paid plan solely because the browser returns to a success URL. Verify Stripe state through a signature-verified webhook and/or server-side Stripe retrieval.

### Spaces and submissions

- Each space belongs to one authenticated owner.
- Public visitors can submit testimonials without creating an account.
- Public submission payloads are untrusted. Validate and normalize all values on the server.
- Only accept configured fields for the target space; ignore or reject unexpected fields.
- Name and email are required by default. Rating is optional at the space level and must be handled consistently when disabled.
- Record consent explicitly. Do not interpret missing consent as permission.
- Treat social-sharing consent and public-display permission as separate concepts if the schema/product requires both.
- Use a stable, unguessable public identifier for share links; do not expose sequential database IDs as security controls.
- Apply rate limiting and spam protections to public endpoints.

### Inbox, favorites, Wall of Love, and visibility

- Owners can access and manage only their own spaces and testimonials.
- Favorite ordering is separate from public visibility.
- A hidden testimonial must not appear on public space pages, Wall of Love, or any embed.
- A testimonial without the required public-display permission/consent must not appear in public embeds. Apply the same rule consistently to every public read path.
- Editing or deleting a testimonial must update relevant dashboard statistics correctly.
- Confirm destructive actions and handle missing/already-deleted records gracefully.

### Embeds

- Public embed responses must expose only fields needed for rendering. Never expose submitter email or private owner data in public embed payloads.
- Filter visibility and consent on the server, not merely in frontend JavaScript.
- Validate embed configuration and allowlist supported style/theme options; never execute arbitrary user-provided HTML or JavaScript.
- Keep iframe/loader output responsive and isolated from the host page. Handle empty states, loading, and failure states.

### Stripe and billing

> **Superseded for this version:** billing is a DEMO with no payment gateway (see PRD section 1a and README "Demo Billing"). Do not add Stripe, webhooks, or real payment processing unless the user explicitly asks. The rules below that mention Stripe are retained only as a reference for a future real-billing phase; the demo rules are: users may change only their own plan through `set_demo_plan()`, limits are enforced in the database, and the UI must never claim a payment occurred.

- Verify webhook signatures using the raw request body and the configured webhook signing secret.
- Persist processed Stripe event IDs and make webhook handling idempotent.
- Handle duplicate and out-of-order events safely; retrieve the current subscription from Stripe when needed to resolve state.
- Handle checkout completion, subscription updates/cancellations, and failed invoices without blindly overwriting newer state.
- Keep Stripe customer/subscription identifiers mapped to the correct authenticated account.
- Never log full payment details, secrets, authorization headers, or sensitive customer data.
- If the paid plan is inactive, past due, canceled, or otherwise not entitled, apply the documented entitlement policy consistently.

## 5. Security and database rules

- Treat Supabase Row Level Security (RLS) as mandatory defense in depth.
- Enable RLS on every table containing user-owned or billing data.
- Policies must scope reads and writes to the authenticated owner and must not trust a client-supplied `user_id`.
- Public submission permissions must be narrowly scoped; do not grant anonymous users general table access.
- Keep privileged writes in server-only code or tightly scoped database functions.
- Use the least-privilege access needed for each operation.
- Add indexes for common owner, space, visibility, creation-time, and Stripe-event lookups.
- Use migrations as the source of truth for schema changes. Do not rely on undocumented manual dashboard edits.
- Never disable RLS to make a feature work. Fix the policy or server-side access pattern instead.
- Never commit `.env`, API keys, service-role keys, webhook secrets, or production data.

## 6. Code quality and dependency discipline

- Prefer small, readable, maintainable changes over clever or overly generic solutions.
- Avoid `any`; use inferred types, explicit types, and safe narrowing.
- Handle loading, empty, success, validation-error, authorization-error, and unexpected-error states.
- Do not swallow exceptions silently. Return safe user-facing errors and log actionable server-side diagnostics without secrets.
- Avoid duplicate business rules. Put plan entitlements and public-display filtering in shared server-side helpers or database functions where appropriate.
- Reuse installed dependencies. Before adding a package, explain why it is necessary and check whether the existing stack already solves the problem.
- Do not update unrelated packages or regenerate the lockfile unnecessarily.
- Keep accessibility basics: semantic HTML, labels, keyboard operation, focus states, and adequate contrast.
- Use realistic responsive layouts; do not leave placeholder buttons that appear functional but do nothing.

## 7. Environment and configuration

- Keep `.env.example` updated whenever a new environment variable is introduced.
- Read secrets only on the server. Use `NEXT_PUBLIC_` only for values explicitly safe to expose.
- Validate required environment variables at startup or at the integration boundary and provide clear setup errors.
- Document local setup, migrations, seed/demo data if applicable, Stripe CLI usage, and deployment configuration in `README.md`.
- Never put real secrets into documentation, source files, test fixtures, or AI prompts.

## 8. Testing expectations

For each meaningful change:

1. Add or update tests for core logic and important edge cases.
2. Run linting and TypeScript checks.
3. Run relevant unit/integration tests.
4. Run a production build at appropriate milestones.
5. Manually verify the affected user flow when feasible.

At minimum, verify:

- Cross-account RLS isolation.
- Free and paid space limits, including simultaneous create requests.
- Per-space testimonial limits, including simultaneous submissions.
- Anonymous submission validation and rate limiting.
- Hidden and non-consented testimonial exclusion from every public endpoint/embed.
- Email privacy in public payloads.
- Stripe webhook signature rejection, duplicate-event idempotency, and subscription state transitions.
- Empty, loading, and error states.
- No secrets in client bundles or repository history.

Do not weaken or delete a test just to make the suite pass. Explain any test that cannot run because of missing external services or credentials.

## 9. Completion checklist

Before declaring a task complete, confirm:

- [ ] The change matches the current phase and acceptance criteria.
- [ ] Authorization, validation, and relevant RLS protections are in place.
- [ ] Loading, empty, success, and error states are handled where applicable.
- [ ] Relevant tests, lint, type-check, and build have been run; results are reported accurately.
- [ ] Migrations and `.env.example` are updated if needed.
- [ ] No secrets, fake success states, dead buttons, or accidental unrelated changes were introduced.
- [ ] Documentation is updated for setup or behavior changes.
- [ ] The next step is stated clearly.

## 10. Agent response format

At the end of each implementation task, report:

1. **Implemented:** concise summary.
2. **Files changed:** list the important files.
3. **Verification:** commands run and pass/fail results.
4. **Security/data notes:** relevant RLS, validation, entitlement, or migration implications.
5. **Remaining work:** known limitations or manual setup.
6. **Next step:** one specific phase/task; do not begin the next phase unless asked or clearly authorized by the active execution prompt.

## 11. First action for a new session

Before writing code, inspect the repository and read `IMPLEMENTATION_GUIDE.md`. Identify the current completed phase from the code and documentation, summarize the current state, and ask which phase/task to execute if the next task is not already explicit. Do not regenerate the app from scratch.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
