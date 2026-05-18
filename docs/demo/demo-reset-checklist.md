# Demo Reset Checklist

Use this checklist before every investor, pilot merchant, or internal tester demo.

## 1. Run Validation Gates
From repo root:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test:smoke
```

Recommended when time allows:

```bash
pnpm --filter @shipwright/web test
pnpm --filter api test
pnpm typecheck
```

Do not start a high-stakes demo if release verification, paid-delivery proof, or browser smoke fails.

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

Confirm local `.env.smoke` includes required values for browser smoke where applicable:

```bash
SMOKE_BUSINESS_EMAIL=
SMOKE_BUSINESS_PASSWORD=
SMOKE_ADMIN_EMAIL=
SMOKE_ADMIN_PASSWORD=
SMOKE_DRIVER_EMAIL=
SMOKE_DRIVER_PASSWORD=
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

Admin and driver:
- `/admin`
- `/admin/command`
- `/admin/pilots`
- `/admin/drivers`
- `/driver`

## 5. Prepare Browser State
Before the session:
- use a clean browser profile or private window for public customer flow
- sign into business, admin, and driver accounts in separate tabs/windows if needed
- close unrelated tabs
- disable password manager popups where possible
- keep latest proof artifact open or accessible

## 6. Prepare Cold-Start Fallback
Staging may cold-start. Before the session:
- open the API `/healthz` route once
- open the staging web root once
- wait for initial slow loads before observers join
- keep latest proof-backed tracking/order/job URLs ready

If cold-start occurs during the demo:
- call it a staging cold-start, not a product failure
- pause instead of clicking repeatedly
- switch to proof-backed artifacts if needed

## 7. Confirm Known Limitations
Have `docs/demo/demo-known-limitations-talk-track.md` open for Q&A.

Be ready to explain:
- staging-only status
- browser payment surface vs proof harness payment execution
- pilot workspace mode/status/readiness are admin-reviewed context signals, not automatic workflow gates
- Resend parked pending verified sender/domain
- no autonomous AI actions
- status-based tracking, not live map tracking
- courier readiness read-only
- payout visibility, not full settlement automation

## 8. Final Pre-Demo Standard
Before any demo, the minimum standard is:

- `pnpm release:verify-staging` passed
- `pnpm proof:staging-paid-delivery` passed
- `pnpm --filter @shipwright/web test:smoke` passed
- latest proof IDs recorded
- staging routes checked
- known limitations ready to explain
