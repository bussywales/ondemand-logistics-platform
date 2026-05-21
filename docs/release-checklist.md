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
- Playwright auto-loads repo-root `.env.smoke` when present.
- Public tracking smoke requires one of:
  - `SMOKE_LATEST_ORDER_ID`
  - `LATEST_ORDER_ID`
- Authenticated workspace/admin/driver/fleet-manager smoke requires credentials and is skipped otherwise.
- Set `SMOKE_REQUIRE_AUTH=true` for release/full smoke mode; missing tracking or authenticated smoke credentials then fail instead of skipping.
- Admin browser smoke includes `/admin`, `/admin/command`, and `/admin/drivers`.
- Full authenticated admin smoke includes `/admin/validation-evidence`; it must render whether evidence exists or the empty state appears. After deployment, open `/admin/release-readiness` before demos/releases to confirm the stored-evidence verdict.
- Admin browser smoke should include `/admin/demo-requests` and `/admin/notifications` when commercial intake or notification delivery changes.
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

## 3.5.1) Stored validation evidence for controlled demos
Controlled demos require stored validation evidence, not only local command output.

Run:

```bash
pnpm rehearsal:verify-staging
```

Then verify:
- `/admin/release-readiness` shows `READY`, or any `NEEDS_REVIEW` posture is explicitly accepted for the session
- `/admin/validation-evidence` shows current release verification, paid-delivery proof, and required-auth smoke records
- the selected pilot rehearsal cockpit reads stored evidence instead of showing missing/stale validation posture
- proof artifacts under `docs/proofs/` remain local and uncommitted
- the UI is read-only evidence review; it does not execute validation commands

The wrapper runs:
1. `RECORD_VALIDATION_EVIDENCE=true pnpm release:verify-staging`
2. `RECORD_VALIDATION_EVIDENCE=true pnpm proof:staging-paid-delivery`
3. `SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke`
4. `pnpm evidence:record` for `PLAYWRIGHT_SMOKE_REQUIRED_AUTH` with `source=rehearsal_wrapper`

If any required step fails, the wrapper prints the failed step and exits non-zero.

## 3.6) Do not merge if
Do not merge or mark staging-ready when:
- release verification fails
- paid-delivery proof fails
- Playwright smoke fails with configured smoke credentials
- `/admin/release-readiness` is `BLOCKED`
- controlled-demo release/proof/smoke evidence is missing or stale in `/admin/validation-evidence` without an explicit facilitator note
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
Resend-backed external email delivery remains optional until a verified sender/domain exists. Demo request/admin notification outbox events can also post to a configured webhook.

What this means:
- external notification send proof is optional until sender/domain setup is complete
- `DEMO_REQUEST_WEBHOOK_URL` enables webhook delivery for demo request/admin follow-up events
- `ADMIN_NOTIFICATION_EMAIL` plus `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` enables admin notification email
- `/admin/notifications` shows safe delivery diagnostics, recent notification outcomes, and admin-only test controls for configured email/webhook channels
- `POST /v1/admin/notifications/test` creates marked `TEST_ADMIN_NOTIFICATION` outbox events; it does not accept webhook URLs from the browser
- invite lifecycle outbox events (`ORG_INVITE_CREATED`, `ORG_INVITE_RESENT`, `ORG_INVITE_CANCELLED`) should process through the same worker skip/send/fail metadata conventions
- missing webhook/email provider env should degrade safely, record a skipped/deferred notification outcome, and not crash the worker
- `/admin/demo-requests`, `/admin/notifications`, and `/admin/command` should show notification posture as pending, sent, skipped/unconfigured, failed, or retrying without exposing secrets or webhook URLs
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
