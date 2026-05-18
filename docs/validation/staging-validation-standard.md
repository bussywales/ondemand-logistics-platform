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
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test:smoke
```

Also record:

- latest release verification artifact path
- latest paid-delivery proof artifact path
- latest order id
- latest job id
- latest payment id
- latest POD id, if present
- staging routes checked for the intended audience

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
- release readiness checks green

The release verification must confirm:

- `/healthz` returns `200`
- `/readyz` returns `200`
- release-critical schema sanity passes when `DATABASE_URL` is present
- authenticated API checks skip cleanly when bearer tokens are absent
- external email delivery can remain skipped while Resend is parked without a verified sender/domain

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
- `/app/reports/end-of-day`
- `/admin`
- `/admin/command`
- `/admin/drivers`
- `/driver`

Browser smoke must validate both unauthenticated and authenticated surfaces when smoke credentials are configured.

## Smoke Users
Use dedicated staging-only smoke accounts. Document roles, not secrets:

- business smoke user: business operator for the staging demo org
- admin smoke user: active platform admin
- driver smoke user: active approved driver profile suitable for driver-route smoke

Required local environment variables for authenticated browser smoke:

```bash
SMOKE_BUSINESS_EMAIL=
SMOKE_BUSINESS_PASSWORD=
SMOKE_ADMIN_EMAIL=
SMOKE_ADMIN_PASSWORD=
SMOKE_DRIVER_EMAIL=
SMOKE_DRIVER_PASSWORD=
```

Supporting browser smoke env:

```bash
STAGING_WEB_BASE_URL=
SMOKE_LATEST_ORDER_ID=
```

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
- Readiness checks must expand when new release-critical schema dependencies are added.
- Browser smoke should stay green after UI, auth, routing, or command-surface changes.
- Authenticated smoke should skip cleanly when env/session is absent, but must pass when smoke credentials are configured.
- Public smoke should not require authentication.
- Release readiness must include support/escalation schema dependencies because order, job, and admin command surfaces depend on them.
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
- A new release-critical schema dependency is missing from readiness or release verification.
- A new authenticated route bypasses auth, org, driver, or platform-admin boundaries.
- `internal_server_error` appears on staging command surfaces such as `/app`, `/app/orders`, `/app/payments`, `/app/reports/end-of-day`, `/admin`, `/admin/command`, `/admin/drivers`, or `/driver`.
- Playwright failures are hidden by weakening the app or silently skipping configured auth checks.

## Known Limitations
- Browser smoke is Chromium-only today.
- There is no cross-browser or mobile matrix yet.
- Browser smoke reaches the checkout/payment surface but does not submit a live Stripe card payment in-browser.
- The paid-delivery proof covers payment authorization/capture through the API proof harness.
- Resend external email remains parked until a verified domain/sender exists.
