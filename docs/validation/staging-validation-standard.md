# ShipWright Staging Validation Standard

This is the required staging quality gate for ShipWright feature work. A change is not staging-ready until these gates pass or a documented owner explicitly accepts a narrower validation scope for a non-release branch.

## Required Validation Gates
Run these before declaring a staging deploy or feature branch ready for review, demos, or controlled tester sessions:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test
pnpm --filter api test
pnpm typecheck
pnpm --filter @shipwright/web test:smoke
```

## Demo Readiness Standard
Before any investor, pilot merchant, or internal tester demo, run at minimum:

```bash
pnpm rehearsal:verify-staging
```

Also record:

- latest release verification artifact path
- latest paid-delivery proof artifact path
- latest order id
- latest job id
- latest payment id
- latest POD id, if present
- What’s New checked for major user-visible changes
- staging routes checked for the intended audience
- `/admin/release-readiness` checked for `READY`, or any `NEEDS_REVIEW` posture explicitly accepted by the demo owner
- `/admin/validation-evidence` checked for current stored release, proof, and required-auth smoke evidence
- selected pilot rehearsal cockpit checked for non-stale validation posture

Use `docs/demo/demo-reset-checklist.md` to prepare accounts, browser state, fallback routes, and known limitation talk tracks.

Optional broader e2e command:

```bash
pnpm --filter @shipwright/web test:e2e
```

`test:e2e` currently runs the same staging Playwright smoke suite. Keep it green when used in CI or local release rehearsal.

## Expected Proof Outcomes
The paid-delivery proof must confirm:

- final job status: `DELIVERED`
- final order status: `FULFILLED`
- payment status: `CAPTURED`
- notification outbox processed for the staged delivery flow
- support escalation schema readiness remains available for command posture, resolution metadata, closeout surfaces, and append-only support history
- support escalation event history remains append-only and available to order/job support timelines
- pilot workspace schema readiness remains available for admin-led pilot mode, readiness, owner, and checklist tracking
- pilot guardrail surfaces remain non-blocking and visible on business/admin pilot routes when a pilot profile is configured
- pilot rehearsal cockpit remains read-only and uses stored validation evidence when `validation_evidence_runs` has current release/proof/smoke records
- validation evidence older than 24 hours is treated as stale for rehearsal readiness
- driver fleet organisation surfaces remain visibility-first and do not change dispatch preference, payout, billing, or courier suspension behavior
- dispatch governance remains human-reviewed: manual assignment override requires reason and typed confirmation, audit history is append-only/read-only for admins, and no driver scoring, suspension, payout, or autonomous reassignment appears
- demo request persistence remains available for public commercial intake and platform-admin review
- demo request creation records internal admin notification posture through `NOTIFY_ADMIN_DEMO_REQUEST_CREATED` outbox events or an explicitly documented fallback
- demo request/admin notification delivery no-ops safely when `DEMO_REQUEST_WEBHOOK_URL`, `ADMIN_NOTIFICATION_EMAIL`, or Resend sender env is absent
- notification diagnostics at `/admin/notifications` can create marked test events for configured email/webhook channels and must not expose secrets
- first-party analytics at `/admin/analytics` remains admin-only and does not store raw IP addresses or raw user agents
- release readiness checks green

## Stored Validation Evidence
Validation commands do not write database evidence by default. To make rehearsal cockpit posture evidence-backed, use the wrapper:

```bash
pnpm rehearsal:verify-staging
```

The wrapper runs this sequence and stops on the first failed required step:

```bash
RECORD_VALIDATION_EVIDENCE=true pnpm release:verify-staging
RECORD_VALIDATION_EVIDENCE=true pnpm proof:staging-paid-delivery
SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke
pnpm evidence:record -- --type PLAYWRIGHT_SMOKE_REQUIRED_AUTH --status PASSED --source rehearsal_wrapper --command "SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke" --summary-json '{"passed":7,"failed":0,"requiredAuth":true}'
```

The wrapper records failed required-auth smoke evidence as `FAILED` before exiting non-zero.

Stored evidence is admin-only at `/admin/validation-evidence`. It records status, command/source, summary, artifact path, and related proof IDs where available. It does not store secrets and does not cause the UI to execute release verification, paid proof, or browser smoke.

`/admin/release-readiness` is the single source admin verdict for release/demo posture. It reads the latest stored `RELEASE_VERIFY`, `PAID_DELIVERY_PROOF`, and `PLAYWRIGHT_SMOKE_REQUIRED_AUTH` records, applies the 24-hour freshness window, and returns `READY`, `NEEDS_REVIEW`, or `BLOCKED`.

For controlled demos, release verification, paid-delivery proof, and required-auth browser smoke evidence should be stored before observers join. Proof artifacts remain local/uncommitted; the admin UI reads stored evidence only and never runs validation commands from the browser.

The release verification must confirm:

- `/healthz` returns `200`
- `/readyz` returns `200`
- release-critical schema sanity passes when `DATABASE_URL` is present
- authenticated API checks skip cleanly when bearer tokens are absent
- external email delivery can remain skipped while Resend is parked without a verified sender/domain
- webhook/admin-email delivery can remain skipped when optional notification secrets are absent, but skipped delivery must not block demo request persistence

## Required Smoke Routes
Public routes:

- `/restaurants/pilot-kitchen-1777370757`
- `/track/[latestOrderId]`

Authenticated routes:

- `/app`
- `/app/orders`
- `/app/orders/[latestOrderId]`
- `/app/jobs/[latestJobId]`
- `/app/payments`
- `/app/finance`
- `/app/reports/end-of-day`
- `/app/settings/team`
- `/admin`
- `/admin/command`
- `/admin/users`
- `/admin/orgs`
- `/admin/fleets`
- `/admin/finance`
- `/admin/demo-requests`
- `/admin/notifications`
- `/admin/operational-resets`
- `/admin/pilots`
- `/admin/pilots/[pilotId]/rehearsal`
- `/admin/validation-evidence`
- `/admin/drivers`
- `/fleet`
- `/driver`

Browser smoke must validate both unauthenticated and authenticated surfaces when smoke credentials are configured.
For release/full smoke mode, set `SMOKE_REQUIRE_AUTH=true`; the smoke suite then fails when tracking or authenticated credentials are missing instead of skipping.

Commercial intake smoke should also check `/demo/request` structurally when demo request capture changes. A staging verification may submit one non-sensitive test request and confirm it appears in `/admin/demo-requests` and is reflected in `/admin/command` commercial intake posture.

When public conversion or pricing changes ship, staging verification should open `/admin/analytics` after public CTA or demo request activity and confirm analytics events are visible or the empty state renders. Analytics collection must never block public navigation or demo request persistence.

When demo request follow-up or notification delivery changes ship, staging verification should also confirm an admin can assign an owner, set a next follow-up date, mark contact, view append-only event history, see notification delivery posture in `/admin/demo-requests`, and open `/admin/notifications` to review configuration diagnostics plus recent test events.

When finance visibility changes ship, staging verification should open `/app/finance`, `/admin/finance`, and `/admin/command` to confirm captured/pending/failed totals, refund-review counts, and transaction rows render. Finance v1 is review-only: no automated refunds, payout automation, or payment-provider mutation should appear.

When dispatch governance changes ship, staging verification should open a recent `/app/jobs/[latestJobId]` detail page and `/admin/dispatch-audit` to confirm manual review controls, assignment audit rows or empty state, courier affiliation copy, and the absence of autonomous scoring/suspension language.

## Smoke Users
Use dedicated staging-only smoke accounts. Document roles, not secrets:

- business smoke user: business operator for the staging demo org
- admin smoke user: active platform admin
- driver smoke user: active approved driver profile suitable for driver-route smoke
- fleet manager smoke user: active `DRIVER_COMPANY` member with `FLEET_MANAGER` role for `/fleet`

Required local environment variables for authenticated browser smoke:

```bash
SMOKE_BUSINESS_EMAIL=
SMOKE_BUSINESS_PASSWORD=
SMOKE_ADMIN_EMAIL=
SMOKE_ADMIN_PASSWORD=
SMOKE_DRIVER_EMAIL=
SMOKE_DRIVER_PASSWORD=
SMOKE_FLEET_MANAGER_EMAIL=
SMOKE_FLEET_MANAGER_PASSWORD=
SMOKE_REQUIRE_AUTH=true
```

Supporting browser smoke env:

```bash
STAGING_WEB_BASE_URL=
SMOKE_LATEST_ORDER_ID=
```

Optional notification delivery env for staging verification:

```bash
DEMO_REQUEST_WEBHOOK_URL=
ADMIN_NOTIFICATION_EMAIL=
RESEND_API_KEY=
NOTIFICATION_FROM_EMAIL=
NOTIFICATION_REPLY_TO_EMAIL=
```

When those notification env values are absent, skipped/unconfigured delivery is expected and should be visible to platform admins without blocking demo request persistence.

Notification delivery testing:

- use `/admin/notifications` to create `TEST_ADMIN_NOTIFICATION` outbox events for `EMAIL` or `WEBHOOK`
- webhook tests use only the configured `DEMO_REQUEST_WEBHOOK_URL`; the browser must not accept arbitrary webhook URLs
- email tests require `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, and `NOTIFICATION_FROM_EMAIL`; optional test recipient email is admin-only and should be non-sensitive
- skipped/unconfigured is acceptable when secrets are intentionally absent
- never commit notification secrets or `.env.smoke`

Do not commit passwords or `.env.smoke`.

## Artifact Expectations
Proof artifacts are written under:

- `docs/proofs/`

Expected artifact families:

- `release-verify-*.json`
- `paid-delivery-*.json`

Proof artifacts remain uncommitted by default unless intentionally exported or attached to a demo/release evidence package.

Playwright artifacts remain local and ignored:

- `apps/web/test-results/`
- `apps/web/playwright-report/`

## Validation Rules
- New features must not bypass proof gates.
- Major user-visible features should update `apps/web/app/_content/product-updates.ts`; if no What’s New entry is needed, document why in the release notes.
- Readiness checks must expand when new release-critical schema dependencies are added.
- Browser smoke should stay green after UI, auth, routing, or command-surface changes.
- Authenticated smoke should skip cleanly when env/session is absent, but must pass when smoke credentials are configured.
- Public smoke should not require authentication.
- Demo request follow-up changes should keep `/admin/demo-requests` and `/admin/command` calm, admin-only, event-audited, and free of CRM/email overclaims.
- Product analytics changes should remain first-party, admin-only for reporting, privacy-conscious, and non-blocking for public conversion flows.
- Operational reset changes should keep `/admin/operational-resets` admin-only, preview-first, per-record selectable, typed-confirmation gated, and non-destructive. Proof orders, jobs, payments, audit events, and proof artifacts must remain historical.
- Release readiness must include support/escalation schema dependencies because order, job, admin command, closeout, and support history surfaces depend on them.
- Support history events must be system-created from support create/update operations; new work must not add manual event creation or deletion paths.
- Rehearsal cockpit should not execute release verification, paid-delivery proof, browser smoke, or destructive pilot controls from the UI in v1.
- Proof artifacts remain uncommitted unless intentionally exported.
- Any staging-only credential changes stay in local env files or the staging secret manager, never in Git.
- Staging validation should use deterministic staged fixtures and smoke users, not personal accounts.

## Do Not Merge If
Do not merge or mark staging-ready if any of the following are true:

- `pnpm release:verify-staging` fails.
- `pnpm proof:staging-paid-delivery` fails.
- `pnpm --filter @shipwright/web test:smoke` fails with configured smoke credentials.
- Web or API tests fail.
- `pnpm typecheck` fails.
- What’s New was not checked for a major user-visible feature and the release notes do not explain the omission.
- A new release-critical schema dependency is missing from readiness or release verification.
- Operational reset tooling can delete orders, jobs, payments, support history, proof evidence, or audit events.
- A new authenticated route bypasses auth, org, driver, or platform-admin boundaries.
- `internal_server_error` appears on staging command surfaces such as `/app`, `/app/orders`, `/app/payments`, `/app/reports/end-of-day`, `/admin`, `/admin/command`, `/admin/drivers`, `/admin/fleets`, or `/driver`.
- Playwright failures are hidden by weakening the app or silently skipping configured auth checks.

## Known Limitations
- Browser smoke is Chromium-only today.
- There is no cross-browser or mobile matrix yet.
- Browser smoke reaches the checkout/payment surface but does not submit a live Stripe card payment in-browser.
- The paid-delivery proof covers payment authorization/capture through the API proof harness.
- Resend external email remains parked until a verified domain/sender exists.
