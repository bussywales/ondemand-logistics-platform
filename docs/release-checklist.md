# Staging Release Verification Runbook

This is the operator path for declaring a ShipWright staging release healthy.

Canonical staging quality gate:
- `docs/validation/staging-validation-standard.md`

## 1) Apply migrations first
- apply required staging migrations before deploy
- migration application is part of release gating, not an optional post-deploy cleanup step
- do not verify a deploy that points at a stale schema
- if `/readyz` reports `schema_compatibility_not_ready`, treat that as a failed release
- if `pnpm release:verify-staging` reports any missing release-critical table or status constraint, the release is failed until the missing migrations are applied

## 2) Deploy
- trigger the staging deploy
- wait for the platform to mark the deploy live
- record:
  - deployed commit sha
  - deploy id or staging deploy URL

## 3) Run the verification command
```bash
pnpm release:verify-staging
```

`pnpm release:verify-staging` auto-loads `/Users/olubusayoadewale/Coding Projects/shipwright/.env.smoke` when it exists.

Required env:
- `SMOKE_API_BASE_URL`

Optional env:
- `DATABASE_URL` for direct DB schema sanity checks
- `SMOKE_BUSINESS_BEARER_TOKEN`
- `SMOKE_DRIVER_BEARER_TOKEN`
- `SMOKE_ADMIN_BEARER_TOKEN`

If `.env.smoke` is absent or `SMOKE_API_BASE_URL` is still missing after auto-loading, the command fails with an actionable message.

## 3.5) Browser smoke (Playwright)
Run browser smoke as part of the staging-ready validation gate.

```bash
pnpm --filter @shipwright/web exec playwright install chromium
pnpm --filter @shipwright/web test:e2e
pnpm --filter @shipwright/web test:smoke
```

Configuration:
- `STAGING_WEB_BASE_URL` should point at the staging web URL.
- Public tracking smoke requires one of:
  - `SMOKE_LATEST_ORDER_ID`
  - `LATEST_ORDER_ID`
- Authenticated workspace/admin/driver/fleet-manager smoke requires credentials and is skipped otherwise.
- Admin browser smoke includes `/admin`, `/admin/command`, and `/admin/drivers`.
- Admin browser smoke should include `/admin/demo-requests` when commercial intake changes.
- Commercial intake changes should verify that a non-sensitive staging request appears in `/admin/demo-requests` and that `/admin/command` shows the demo request posture.
- Fleet-manager browser smoke includes `/fleet` with a dedicated `FLEET_MANAGER` smoke account.
- Required/used auth variables:
  - `SMOKE_BUSINESS_EMAIL`, `SMOKE_BUSINESS_PASSWORD`
  - `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`
  - `SMOKE_DRIVER_EMAIL`, `SMOKE_DRIVER_PASSWORD`
  - `SMOKE_FLEET_MANAGER_EMAIL`, `SMOKE_FLEET_MANAGER_PASSWORD`
- Playwright artifacts are local-only and ignored:
  - `playwright-report`
  - `test-results`
- Playwright complements, not replaces, release verification:
  - `pnpm release:verify-staging`
  - `pnpm proof:staging-paid-delivery`

## 3.6) Do not merge if
Do not merge or mark staging-ready when:
- release verification fails
- paid-delivery proof fails
- Playwright smoke fails with configured smoke credentials
- a major user-visible feature ships without a `/app/updates`, `/driver/updates`, or `/admin/updates` What’s New entry, unless the release notes explain why no entry is needed
- readiness is missing a critical schema dependency introduced by the change
- a new route bypasses auth, org, driver, or platform-admin role boundaries
- `internal_server_error` appears on staging command surfaces

See the full rule set in `docs/validation/staging-validation-standard.md`.

## 3.7) What’s New checkpoint
For every major user-visible delivery:
- add or update a short operator-facing What’s New entry in `apps/web/app/_content/product-updates.ts`
- include a title, concise summary, audience, release date/version when used, and CTA link when relevant
- verify the entry appears on the relevant `/app/updates`, `/driver/updates`, or `/admin/updates` feed
- if no What’s New entry is needed, record the reason in the release notes

## 4) What the command runs
1. `GET /healthz`
2. `GET /readyz`
3. direct schema sanity when `DATABASE_URL` is present:
   - `platform_admins`
   - `notification_reads`
   - `customer_orders`
   - `payments`
   - `jobs`
    - `outbox_messages`
    - `demo_requests`
   - `customer_orders.status` supports `FULFILLED`
4. optional business smoke when `SMOKE_BUSINESS_BEARER_TOKEN` is set:
   - `GET /v1/business/restaurants`
   - `GET /v1/business/jobs?page=1&limit=20`
5. optional driver smoke when `SMOKE_DRIVER_BEARER_TOKEN` is set:
   - `GET /v1/driver/me/offers`
6. optional admin smoke when `SMOKE_ADMIN_BEARER_TOKEN` is set:
   - `GET /v1/admin/overview`
7. external notification status from recent audit signals
   - commercial intake may record `NOTIFY_ADMIN_DEMO_REQUEST_CREATED` as an internal outbox event; this does not imply outbound email delivery
8. proof artifact write to `docs/proofs/release-verify-<timestamp>.json`
9. release decision

If only `SMOKE_API_BASE_URL` is present:
- `/healthz` runs
- `/readyz` runs
- direct schema sanity is skipped cleanly if `DATABASE_URL` is missing
- authenticated checks are skipped cleanly if bearer tokens are missing

## 5) Required pass conditions
- `GET /healthz` returns `200`
- `GET /readyz` returns `200`
- direct DB schema sanity passes when `DATABASE_URL` is set
- authenticated business smoke passes when `SMOKE_BUSINESS_BEARER_TOKEN` is set
- authenticated driver smoke passes when `SMOKE_DRIVER_BEARER_TOKEN` is set
- authenticated admin smoke passes when `SMOKE_ADMIN_BEARER_TOKEN` is set
- release is not healthy if any required check fails

## 6) Readiness failure meaning
`/healthz` is liveness-only.

`/readyz` includes:
- database connectivity
- schema compatibility for current release-critical flows:
  - quotes
  - jobs and tracking
  - payments
  - customer orders
  - release-critical support tables added after `0011`:
    - `public.notification_reads`
    - `public.platform_admins`
  - `customer_orders.status` supports `FULFILLED`

If required tables or columns are missing, `/readyz` returns `503` with `schema_compatibility_not_ready`.

## 7) Paid delivery proof
After release verification passes, run the deeper proof loop:

```bash
cp .env.proof.example .env.proof
pnpm proof:staging-paid-delivery
```

Reference:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/staging-paid-delivery-proof.md`

This writes:
- `docs/proofs/paid-delivery-<timestamp>.json`

Proof env behavior:
- the command auto-loads `/Users/olubusayoadewale/Coding Projects/shipwright/.env.proof` when present
- already-exported env values are preserved
- if required proof env is still missing after auto-load, the command fails with an actionable message instead of requiring manual shell sourcing

## 8) External notification caveat
Resend-backed external email delivery is intentionally parked until a verified sender/domain exists.

What this means:
- external notification send proof is optional until sender/domain setup is complete
- missing provider env should degrade safely, not crash the worker
- a parked email provider is not by itself a failed staging release unless the explicit release goal is outbound-email verification

## 8.5) Pilot fallback playbooks
- confirm `docs/playbooks/README.md` and the individual pilot recovery playbooks are present before any wider pilot or investor-demo release
- confirm `/help/pilot-operations` is accessible from the deployed web app
- treat missing fallback playbooks as a release-review gap for live pilot operations

## 9) Evidence to record
- deployed commit sha
- deploy id or staging deploy URL
- migration confirmation
- `healthz` result
- `readyz` result
- release verifier output
- proof artifact path under `docs/proofs/`
- any request ids from failed checks

## 10) Skipped checks
`SKIP` is acceptable only for optional checks:
- business smoke when `SMOKE_BUSINESS_BEARER_TOKEN` is absent
- driver smoke when `SMOKE_DRIVER_BEARER_TOKEN` is absent
- admin smoke when `SMOKE_ADMIN_BEARER_TOKEN` is absent
- direct schema sanity when `DATABASE_URL` is absent
- external notifications when no provider signal exists

Do not treat skipped optional checks as proof that the corresponding path is healthy.
