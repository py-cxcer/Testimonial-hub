# Testimonial Hub — Autonomous Product Audit, Repair & Quality Assurance

You are acting as the **principal software engineer, senior full-stack developer, QA engineer, security reviewer, and product-minded technical lead** responsible for bringing Testimonial Hub to a reliable, production-ready state.

Your task is not merely to review the code or suggest improvements. You must independently determine whether the application actually fulfills its intended purpose, identify everything that prevents it from doing so, make the necessary changes, and verify those changes through evidence.

You have the authority to make reasonable technical and product decisions independently, without asking me to approve every small change. Use your judgment to resolve implementation gaps, bugs, inconsistencies, and usability problems while preserving the intended product.

The objective is a complete, coherent, secure, maintainable, and functional application—not simply code that compiles or a UI that looks finished.

---

## 1. Establish the source of truth

Before making changes, locate and read all relevant project documentation, including:

- @AGENTS.md
- @IMPLEMENTATION_GUIDE.md
- The @PRD.md and any other product requirements or planning documents
- @README.md, environment templates, migration files, and existing technical documentation
- Existing tests and documented acceptance criteria

Inspect the complete repository, current Git state, dependencies, application architecture, and existing implementation.

Use this priority when resolving conflicts:

1. Explicit product requirements and the @PRD.md .
2. Security and data-integrity requirements.
3. @AGENTS.md and architectural constraints.
4. @IMPLEMENTATION_GUIDE.md and phase-specific acceptance criteria.
5. Existing implementation and established conventions.
6. Your own engineering judgment for unspecified details.

If the documentation conflicts with itself, identify the conflict and resolve it using the product's intended behavior and security requirements. Do not blindly follow outdated instructions when the actual implementation reveals a clear inconsistency.

Do not restart the project from scratch. Preserve working code and existing user data.

## 2. Determine whether the product actually works

Audit the application as a real user would experience it, not just as a collection of source files.

For every feature specified in the PRD, determine:

- What the feature is supposed to do.
- Whether it is implemented.
- Whether its UI is connected to real application logic and persisted data.
- Whether the expected user journey works from beginning to end.
- Whether validation, loading, success, empty, and error states behave correctly.
- Whether the feature works after navigation, refresh, logout/login, and reopening saved data where applicable.
- Whether authorization and business rules are enforced on the server, not merely hidden in the UI.
- Whether the implementation satisfies the relevant acceptance criteria.

Identify fake functionality, placeholder implementations, hardcoded data masquerading as real data, dead buttons, incomplete flows, silent failures, and features that appear complete but do not work.

Create an internal requirements-to-implementation checklist and maintain it throughout the audit.

## 3. Audit the entire application

Review all applicable areas, including the following.

### Architecture and code quality

- Next.js App Router architecture and server/client component boundaries.
- TypeScript correctness and unsafe type assertions.
- Server actions, route handlers, API contracts, and error handling.
- React state management, form handling, validation, and component reuse.
- Dependency compatibility, configuration, build behavior, and maintainability.
- Duplicated logic, unnecessary complexity, dead code, and inconsistent conventions.

### Authentication and account management

- Signup, login, logout, session persistence, redirects, and protected routes.
- Supabase SSR client initialization, cookie handling, and authentication state.
- Duplicate registrations, invalid credentials, session expiration, and recovery flows where implemented.
- Profile and subscription initialization.
- Intermittent failures, including Next.js errors such as `fetch failed`.

### Database and data integrity

- SQL migrations and the actual schema expected by the application.
- Foreign keys, indexes, constraints, and triggers.
- Supabase Row Level Security policies and ownership checks.
- Missing tables, schema-cache problems, incorrect queries, and mismatched column names.
- Race conditions, duplicate records, partial updates, and inconsistent subscription state.
- Data isolation between different users and spaces.

Never assume the remote database matches the migration files. Inspect it if authorized access is available. If access is unavailable, distinguish verified code from unverified remote configuration.

### Spaces and testimonial collection

- Creating, editing, viewing, and deleting spaces.
- Configurable form fields, required fields, ratings, themes, and public share URLs.
- Public testimonial submission without requiring submitters to create accounts.
- Input validation, spam protection, duplicate submissions, and failure recovery.
- Correct handling of consent and optional social/profile information.

### Inbox and Wall of Love

- Testimonial listing, editing, deletion, hiding, and favoriting.
- Hearting testimonials for Wall of Love inclusion.
- Consistent behavior between saved state and displayed state.
- Correct handling of hidden testimonials and consent restrictions.
- Accurate counts, empty states, and updates after mutations.

### Dashboard and user experience

- Dashboard statistics and date-range/time-density filters.
- Responsive layouts and sidebar scrolling behavior.
- Light/dark mode consistency and persisted theme preferences.
- Form accessibility, keyboard navigation, visual hierarchy, and error feedback.
- Navigation, loading indicators, responsive behavior, and browser console errors.

### Embed Builder

- Layouts, themes, background customization, animations, and live preview.
- Saving and restoring configuration.
- Consistency between preview and the actual embedded widget.
- Grid/masonry and carousel rendering, responsiveness, and external website compatibility.
- Correct embed code generation and configuration updates.
- Exclusion of hidden, private, or non-consented testimonials from every public endpoint and widget.

### Billing and subscription enforcement

- Free and paid plan definitions and limits.
- Checkout initiation, success/cancel flows, Stripe webhooks, and subscription state synchronization.
- Signature verification, idempotency, duplicate events, and out-of-order events.
- Server-side enforcement of plan limits.
- Prevention of unauthorized upgrades and incorrect entitlement changes.

### Security and privacy

- Secrets and environment variables.
- Server-only privileged credentials.
- Authentication and authorization boundaries.
- SQL injection, cross-site scripting, unsafe HTML, and input-validation issues.
- Rate limiting, abuse prevention, and sensitive-data exposure.
- Privacy of emails, private testimonials, and user-owned records.
- Secure error messages and logging.

Prioritize exploitable security flaws and data-integrity issues over cosmetic improvements.

## 4. Independently decide what needs to change

Do not wait for me to specify every bug or prescribe every fix.

If your review reveals that a feature does not fulfill its intended purpose, you may change the implementation using your own engineering judgment.

You are authorized to:

- Fix confirmed bugs.
- Complete unfinished features already required by the PRD.
- Refactor code when necessary to fix systemic problems.
- Correct database queries, migrations, constraints, and RLS policies.
- Improve poor error handling and inconsistent application state.
- Repair broken authentication and session handling.
- Improve confusing UX and accessibility when it materially affects usability.
- Add regression tests and missing validation.
- Remove unnecessary complexity or dependencies when doing so is safe.
- Improve performance and reliability where evidence supports the change.
- Update documentation when the implementation changes.

For unspecified behavior, choose the simplest secure, predictable, maintainable solution consistent with the product.

Do not introduce unrelated features, redesign the product's identity, or expand the scope merely because an alternative is interesting.

Do not disable security controls, weaken RLS, bypass authentication, hardcode secrets, hide errors, or use mock data to make broken functionality appear successful.

If a schema change is necessary, create an appropriate migration that preserves existing data. Do not destructively reset a database to make tests pass.

## 5. Work autonomously, but systematically

Follow this workflow:

**Stage A — Discovery**

Inspect the repository, documentation, runtime configuration, current application behavior, and available verification tools.

**Stage B — Baseline assessment**

Run existing checks and reproduce important failures. Establish what works, what fails, and what remains unverified.

**Stage C — Prioritized repair plan**

Prioritize findings by severity and user impact:

- Critical: serious security exposure, data loss, or core application failure.
- High: broken authentication, core workflows, authorization, or major data-integrity defects.
- Medium: significant functional defects, inconsistent state, or major usability problems.
- Low: minor UI, maintainability, or nonessential polish.

**Stage D — Implementation**

Fix related problems in controlled groups. Preserve working behavior and minimize unnecessary changes. Explain major architectural or data-model decisions in your final report, but do not interrupt progress for routine implementation choices.

**Stage E — Regression verification**

Test the affected functionality after each meaningful change. Revisit related features to detect regressions.

**Stage F — Final acceptance audit**

Compare the resulting application against the PRD, project instructions, and acceptance criteria. Re-run relevant checks and verify the final state.

Do not stop after producing a plan or identifying the first bug. Continue through implementation and verification as far as the available environment permits.

## 6. Testing requirements

Use the available tools to perform real verification.

At minimum, evaluate:

- Dependency installation and configuration.
- Linting and TypeScript checks.
- Automated tests.
- Production build.
- Authentication and session behavior.
- Core user journeys.
- Database ownership and RLS isolation.
- Public submission and testimonial visibility rules.
- Embed configuration persistence and rendering.
- Subscription limits and billing security, if implemented.
- Responsive behavior and relevant browser console/network errors.

Use browser automation or manual browser testing if available. Use test accounts and test environments wherever possible.

For intermittent failures, repeat the relevant operation and inspect the actual request, response, logs, and stack trace. A single successful attempt is not sufficient evidence that an intermittent issue has been resolved.

If a test cannot be performed because credentials, network access, email delivery, Stripe configuration, or a remote service is unavailable, document the limitation and verify everything else that can be tested safely.

Never fabricate test results or claim that external integrations work without verifying them.

## 7. Evidence and decision-making

Every significant finding must be classified as:

- **Confirmed:** supported by reproducible behavior, actual logs, failing tests, or a demonstrated code defect.
- **Probable:** supported by evidence, but not conclusively reproduced.
- **Potential risk:** a plausible issue that has not been demonstrated to fail.

For significant findings, record the affected files, evidence, root cause, fix, and verification.

When evidence is incomplete, investigate further if a reasonable diagnostic path exists. Otherwise, state what remains unknown.

Do not change code based solely on speculation when the change could introduce security risks, data loss, or significant architectural consequences.

You may make ordinary implementation decisions independently. For irreversible operations, destructive database changes, production deployments, billing changes involving real money, or actions requiring access beyond the available authorization, stop and request explicit approval.

## 8. Definition of done

The application should not be considered complete simply because it compiles.

Completion requires:

- Every PRD requirement mapped to an implementation and a verification result.
- All critical and high-severity defects fixed or explicitly documented as blocked.
- Core user journeys working end-to-end where the environment permits verification.
- No known unresolved critical security or data-integrity issue.
- Relevant lint, type, test, and production-build checks passing, or their failures clearly explained.
- No new critical regressions introduced by the repairs.
- Accurate documentation of required environment configuration and external services.
- A clear distinction between verified functionality and functionality that remains unverified.

If a criterion cannot be satisfied because an external dependency is unavailable, do not misrepresent the application as fully production-ready.

Do not chase arbitrary perfection or continue making speculative changes indefinitely. Stop when the documented acceptance criteria are satisfied, important defects have been addressed, and further improvements are optional rather than necessary for correctness, security, or intended functionality.

## 9. Final report

When finished, provide a concise but comprehensive report containing:

1. **Overall assessment:** whether the application fulfills its intended purpose.
2. **Feature coverage:** a requirements checklist marked PASS, FAIL, or BLOCKED.
3. **Confirmed defects:** severity, root cause, and user impact.
4. **Changes made:** files modified, created, or removed, with explanations.
5. **Verification results:** commands, tests, browser checks, and actual outcomes.
6. **Security and data-integrity assessment:** issues found and their resolution.
7. **Remaining limitations:** blockers, unverified integrations, and required manual configuration.
8. **Final readiness:** whether the project is suitable for continued development, a controlled demo, or production deployment, with justification.

Do not give a blanket "everything works perfectly" assessment unless the evidence supports it.

---

## Final instruction

Take ownership of the result.

Think like the engineer who will be responsible for maintaining this application after launch. Understand the intended product, examine the actual implementation, make sound decisions, fix what is broken, and verify what you changed.

**I am giving you autonomy over the technical investigation and implementation decisions within the existing product scope. Do not merely tell me what I should fix. Make the necessary changes yourself whenever the environment and available permissions allow it.**

Begin by inspecting the project and its documentation. Then proceed through the audit, repair, and verification workflow until you reach the defined stopping criteria.

## 10. Demo Payment Wall — No Payment Gateway

For this version of Testimonial Hub, **do not integrate Stripe or any other real payment gateway**. I want a functional demonstration of the freemium business model without the complexity of real payment processing, external billing credentials, webhooks, or financial transactions.

Use your own engineering judgment to implement a clean, realistic demo subscription flow that resembles a SaaS upgrade experience.

### Required behavior

**Free plan**
- Up to 3 spaces.
- Up to 100 testimonials per space.
- Display the user's current plan and usage.
- Show an upgrade banner or payment wall when appropriate.

**Demo paid plan**
- Simulate the existing Pro plan priced at $9.99/month.
- Up to 25 spaces.
- Up to 1,000 testimonials per space.
- Display the plan comparison, pricing, benefits, and an upgrade button.

### Demo upgrade flow

When the user clicks Upgrade:

1. Show a checkout-style confirmation page or modal with the selected plan, price, and features.
2. Clearly label the experience as a demo. Do not collect payment information or imply that a real transaction is taking place.
3. Allow the user to confirm the simulated upgrade.
4. On confirmation, persist the demo subscription state in the database.
5. Update the user's plan badge, dashboard, billing page, usage limits, and available features immediately.
6. Allow the user to cancel the upgrade flow without changing their plan.
7. Provide a way to simulate returning to the Free plan or resetting demo subscription state for testing, where appropriate.

### Technical and security requirements

- Remove Stripe-specific code, SDK dependencies, webhook handlers, environment variables, and configuration only after checking their actual usage and safely removing obsolete references.
- Replace real checkout and webhook flows with a simple, consistent demo subscription service.
- Enforce plan limits on the server and in database operations. Never rely only on hiding buttons in the frontend.
- Ensure users can modify only their own subscription state. Do not allow one user to upgrade another user's account.
- Use a database-backed subscription record so the plan persists across refreshes and login sessions.
- Make simulated upgrades idempotent and handle concurrent requests safely.
- Clearly distinguish demo subscription state from a real paid subscription in the data model and user interface.
- Never claim that a payment was processed, a real subscription was purchased, or revenue was collected.
- Do not introduce unnecessary payment-related complexity or external dependencies.

### Product experience

The result should feel like a believable SaaS subscription experience: users can encounter upgrade prompts, compare plans, confirm a demo upgrade, and immediately use the higher plan's features.

The interface should be polished and coherent with the existing dashboard, including loading states, success/error feedback, responsive layouts, and light/dark themes.

### Acceptance criteria

Consider this feature complete only when:

- A Free user is restricted to the Free plan's limits.
- The user can open the upgrade wall and review the Pro plan.
- Confirming a demo upgrade persists the Pro plan and unlocks its limits.
- The upgrade remains active after logout, login, and page refresh.
- Canceling the upgrade leaves the existing plan unchanged.
- Unauthorized users cannot change another user's plan.
- Returning to Free correctly restores Free plan limits without corrupting or deleting existing data.
- No Stripe integration or real payment processing is required to demonstrate the flow.

Update the PRD implementation checklist, architecture, environment documentation, and tests to reflect this decision. Do not implement real payment processing unless I explicitly request it in the future.