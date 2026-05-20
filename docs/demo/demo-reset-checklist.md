# Demo Reset Checklist

Use this checklist before every investor, pilot merchant, or internal tester demo.

## 1. Run Validation Gates
From repo root:

```bash
pnpm rehearsal:verify-staging
```

The wrapper runs release verification, paid-delivery proof, required-auth browser smoke, and required-auth smoke evidence recording in order. If any required step fails, stop the reset and use the printed failed step as the owner handoff.

Recommended when time allows:

```bash
pnpm --filter @shipwright/web test
pnpm --filter api test
pnpm typecheck
```

Do not start a high-stakes demo if release verification, paid-delivery proof, or browser smoke fails.
Do not start a controlled demo if `/admin/release-readiness` is `BLOCKED`. If it is `NEEDS_REVIEW`, the facilitator must explain and accept the missing/stale/non-critical posture before observers join.

## 2. Capture Latest Proof IDs
From the latest `docs/proofs/paid-delivery-*.json`, record:

- order id:
- job id:
- payment id:
- POD id:
- final job status:
- final order status:
- final payment status:
- artifact path:

From the latest `docs/proofs/release-verify-*.json`, record:

- artifact path:
- `/healthz` result:
- `/readyz` result:
- schema sanity result:
- notification provider status:

Expected final states:
- job status: `DELIVERED`
- order status: `FULFILLED`
- payment status: `CAPTURED`

## 3. Confirm Smoke Users
Confirm staging-only accounts are available without exposing passwords in notes:

- business smoke user signs into `/app`
- admin smoke user signs into `/admin`
- driver smoke user signs into `/driver`
- fleet manager smoke user signs into `/fleet`

Confirm local `.env.smoke` includes required values for browser smoke where applicable:

```bash
SMOKE_BUSINESS_EMAIL=
SMOKE_BUSINESS_PASSWORD=
SMOKE_ADMIN_EMAIL=
SMOKE_ADMIN_PASSWORD=
SMOKE_DRIVER_EMAIL=
SMOKE_DRIVER_PASSWORD=
SMOKE_FLEET_MANAGER_EMAIL=
SMOKE_FLEET_MANAGER_PASSWORD=
STAGING_WEB_BASE_URL=
SMOKE_LATEST_ORDER_ID=
```

Do not commit `.env.smoke` or passwords.

## 4. Confirm Staging Routes
Open or smoke-check:

Public:
- `/`
- `/restaurants/pilot-kitchen-1777370757`
- `/track/[latestOrderId]`

Business:
- `/app`
- `/app/orders`
- `/app/orders/[latestOrderId]`
- `/app/jobs/[latestJobId]`
- `/app/payments`
- `/app/reports/end-of-day`
- `/app/restaurant`
- `/app/notifications`

Confirm the business guardrail strip is visible on `/app`, orders, jobs, payment risk, and end-of-day report surfaces when a pilot profile is configured.

Admin and driver:
- `/admin`
- `/admin/command`
- `/admin/operational-resets`
- `/admin/pilots`
- `/admin/pilots/[pilotId]/rehearsal`
- `/admin/release-readiness`
- `/admin/validation-evidence`
- `/admin/drivers`
- `/driver`

For the selected pilot profile, open the rehearsal cockpit and confirm:
- recommendation is not `BLOCKED`
- blocked checks are either cleared or owned
- high/critical support escalations are resolved or explicitly deferred by the demo owner
- validation posture is backed by current stored evidence in `/admin/validation-evidence`, or explicitly called out as missing/stale
- release readiness is `READY`, or the demo owner has accepted a documented `NEEDS_REVIEW` posture
- release verification, paid-delivery proof, and required-auth smoke evidence should be less than 24 hours old before a formal rehearsal

## 5. Prepare Browser State
## 5. Review Operational Reset Tools
If staging/demo records are cluttering the walkthrough, open `/admin/operational-resets` before the session.

Use reset tools only for non-destructive tidy actions:
- preview first
- confirm affected items
- execute only with typed confirmation: `RESET DEMO DATA`
- close/archive old demo requests when appropriate
- close clearly marked test/demo support escalations with reset closeout evidence
- record stale pilot rehearsal recommendations without mutating proof records

Reset tools do not:
- hard delete records
- delete audit history
- delete or mutate payments
- delete or mutate orders/jobs
- alter paid-delivery proof history

For any demo, use fresh proof records when the current proof/order/job data is too cluttered.

## 6. Prepare Browser State
Before the session:
- use a clean browser profile or private window for public customer flow
- sign into business, admin, and driver accounts in separate tabs/windows if needed
- close unrelated tabs
- disable password manager popups where possible
- keep latest proof artifact open or accessible

## 7. Prepare Cold-Start Fallback
Staging may cold-start. Before the session:
- open the API `/healthz` route once
- open the staging web root once
- wait for initial slow loads before observers join
- keep latest proof-backed tracking/order/job URLs ready

If cold-start occurs during the demo:
- call it a staging cold-start, not a product failure
- pause instead of clicking repeatedly
- switch to proof-backed artifacts if needed

## 8. Confirm Known Limitations
Have `docs/demo/demo-known-limitations-talk-track.md` open for Q&A.

Be ready to explain:
- staging-only status
- browser payment surface vs proof harness payment execution
- pilot workspace mode/status/readiness are admin-reviewed context signals, not automatic workflow gates
- rehearsal cockpit is read-only and does not run proof commands from the browser
- operational reset tools are admin-only and non-destructive; they close/archive safe demo clutter but do not alter proof orders/jobs/payments
- pilot guardrails warn, explain, and guide; they do not block workflows in v1
- Resend parked pending verified sender/domain
- no autonomous AI actions
- status-based tracking, not live map tracking
- courier readiness read-only
- payout visibility, not full settlement automation

## 9. Final Pre-Demo Standard
Before any demo, the minimum standard is:

- `pnpm rehearsal:verify-staging` passed
- release, proof, and required-auth smoke evidence IDs were printed or verified in `/admin/validation-evidence`
- latest proof IDs recorded
- `/admin/release-readiness` reviewed for the single release/demo verdict
- `/admin/validation-evidence` reviewed for current stored evidence
- rehearsal cockpit reviewed for the selected pilot workspace
- operational reset tools previewed or intentionally skipped
- staging routes checked
- known limitations ready to explain
