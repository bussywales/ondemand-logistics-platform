# Staging Paid Delivery Proof

## Purpose
This runbook proves the Stage 1 staging spine:

`public restaurant checkout -> paid order -> dispatch offer -> driver completion -> payment capture -> fulfilled customer order`

Use it after migrations, `/healthz`, `/readyz`, and the standard staging release verification pass. Code existing in the repo is not enough; this proof checks the live staging API, staging database state, driver fixture, outbox side effects, and downstream records.

## Prerequisites
- staging API is deployed and reachable at `https://api-staging-qvmv.onrender.com`
- web is deployed at `https://ondemand-logistics-platform-web.vercel.app` for browser checks
- release-critical migrations are applied, including:
  - customer orders
  - fulfilled order status support
  - notification reads
  - platform admins
- `/healthz` and `/readyz` return `200`
- Render staging has Stripe test-mode env configured
- a pilot restaurant exists with an active menu at `pilot-kitchen-1777370757`
- local shell has values from `.env.proof.example`
- `SUPABASE_SERVICE_ROLE_KEY` is recommended for repeatable fixture creation and required if Supabase signup is rate-limited

## Fixture
The proof harness creates or refreshes these staging users:

| Role | Email | Purpose |
| --- | --- | --- |
| Business operator | `staging-business-operator@shipwright.example.com` | Owns the seeded staging org. |
| Driver | `staging-driver@shipwright.example.com` | Receives and completes the dispatch offer. |
| Consumer | `staging-consumer@shipwright.example.com` | Reserved fixture for customer-facing checks. |

The driver fixture is reset to the minimum dispatch-eligible state:
- `drivers.is_active = true`
- `drivers.availability_status = ONLINE`
- `drivers.active_job_id = null`
- latest location near the pilot pickup area
- approved `driver_verifications` row
- primary `BIKE` vehicle row

This fixture is for staging proof only. Do not use it as production data.

## How to run
```bash
cp .env.proof.example .env.proof
set -a
source .env.proof
set +a
pnpm proof:staging-paid-delivery
```

Defaults:
- `STAGING_PROOF_API_BASE_URL=https://api-staging-qvmv.onrender.com`
- `STAGING_PROOF_RESTAURANT_SLUG=pilot-kitchen-1777370757`
- `STAGING_PROOF_PAYMENT_METHOD_ID=pm_card_visa`

When the proof passes it writes:
- `docs/proofs/paid-delivery-<timestamp>.json`

## Recommended order of operations
1. Run release verification first:

```bash
pnpm release:verify-staging
```

2. If that passes, run the deeper paid-delivery proof:

```bash
pnpm proof:staging-paid-delivery
```

Release verification auto-loads `.env.smoke` when present. Paid-delivery proof still uses `.env.proof`.

## What the proof does
1. creates or reuses fixture Supabase auth users
2. seeds domain rows for business operator, approved BIKE driver, and driver location
3. reads the public restaurant menu
4. submits a public paid customer order using a Stripe test payment method
5. waits for a dispatch offer for the staged driver
6. accepts the offer through `/v1/driver/me/offers/:offerId/accept`
7. progresses the driver job through pickup, drop-off, POD, and delivered
8. verifies downstream records:
   - `customer_orders`
   - `customer_order_items`
   - `jobs`
   - `payments`
   - `proof_of_delivery`
   - `job_events`
   - `audit_log`
   - `outbox_messages`
9. confirms:
   - final job status is `DELIVERED`
   - payment status is `CAPTURED`
   - final customer order status is `FULFILLED`

## Expected passing output
The command prints concise `PASS` lines and ends with JSON similar to:

```json
{
  "orderId": "...",
  "jobId": "...",
  "offerId": "...",
  "paymentId": "...",
  "podId": "...",
  "finalJobStatus": "DELIVERED",
  "finalOrderStatus": "FULFILLED",
  "paymentStatus": "CAPTURED",
  "customerOrderItemsCount": 1,
  "jobEventsCount": 5,
  "auditLogCount": 1,
  "outbox": []
}
```

The proof artifact stores the same payload plus:
- `timestamp`
- `apiBaseUrl`
- `gitCommit` when available locally

## Failure handling
- `restaurant_menu_empty`: load an active menu for the pilot restaurant before rerunning
- `poll_timeout:driver_offer`: confirm the staged driver is `ONLINE`, approved, `BIKE`, close to pickup, and not on another active job
- `signup_rate_limited`: add `SUPABASE_SERVICE_ROLE_KEY` to `.env.proof` or wait for Supabase auth rate limits to reset
- `request_failed:503` from checkout: confirm Render staging Stripe env
- payment remains `AUTHORIZED`: confirm worker processing and `PAYMENT_CAPTURE_REQUESTED` handling
- final order is not `FULFILLED`: inspect delivered/captured convergence and completion trigger/worker path

## External notification caveat
External operational email delivery is intentionally parked until a verified sender/domain exists for Resend. Do not treat a missing email send as a paid-delivery proof failure unless the explicit goal is external-notification verification.

## Proof archive
- store generated artifacts under `docs/proofs/`
- do not edit JSON artifacts manually
- generate a fresh proof when you need updated evidence
