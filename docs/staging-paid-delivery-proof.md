# Staging Paid Delivery Proof

## Purpose
This runbook proves the Stage 1 spine in staging:

`public restaurant checkout -> paid order -> dispatch offer -> driver completion -> payment capture`

Use it after migrations, `/healthz`, `/readyz`, and the standard staging smoke pass. Code existing in the repo is not enough; this proof checks the live staging API, staging database, driver fixture, outbox side effects, and downstream records.

## Prerequisites
- Staging API is deployed and reachable at `https://api-staging-qvmv.onrender.com`.
- Web is deployed at `https://ondemand-logistics-platform-web.vercel.app` for browser checks.
- Migration `0011_stage1_customer_orders.sql` is applied to staging.
- `/healthz` and `/readyz` return `200`.
- Render API staging has Stripe test mode env configured.
- A pilot restaurant exists with an active menu at `pilot-kitchen-1777370757`.
- Local shell has Supabase and database env values from `.env.proof.example`.

## Fixture
The proof harness creates or refreshes these staging users:

| Role | Email | Purpose |
| --- | --- | --- |
| Business operator | `staging-business-operator@shipwright.local` | Owns the seeded staging org. |
| Driver | `staging-driver@shipwright.local` | Receives and completes the dispatch offer. |
| Consumer | `staging-consumer@shipwright.local` | Reserved fixture for customer-facing checks. |

The driver fixture is reset to the minimum dispatch-eligible state:
- `drivers.is_active = true`
- `drivers.availability_status = ONLINE`
- `drivers.active_job_id = null`
- latest location near the pilot pickup area
- approved `driver_verifications` row
- primary `BIKE` vehicle row

This fixture is for staging proof only. Do not use it as production data.

## How To Run
```bash
cp .env.proof.example .env.proof
set -a
source .env.proof
set +a
pnpm proof:staging-paid-delivery
```

The command defaults to:
- `STAGING_PROOF_API_BASE_URL=https://api-staging-qvmv.onrender.com`
- `STAGING_PROOF_RESTAURANT_SLUG=pilot-kitchen-1777370757`
- `STAGING_PROOF_PAYMENT_METHOD_ID=pm_card_visa`

## Outbox Processing Mode
Default mode leaves outbox processing to the deployed staging worker:

```bash
STAGING_PROOF_PROCESS_OUTBOX=false
```

If the deployed worker is unavailable and the operator has the required secure provider env locally, the harness can process only the scoped proof job/payment outbox messages:

```bash
STAGING_PROOF_PROCESS_OUTBOX=true
STRIPE_SECRET_KEY=sk_test_...
pnpm proof:staging-paid-delivery
```

Do not commit provider secrets.

## What The Proof Does
1. Creates or reuses fixture Supabase auth users.
2. Seeds domain rows for business operator, org membership, approved BIKE driver, and driver location.
3. Reads the public restaurant menu.
4. Submits a public paid customer order using a Stripe test payment method.
5. Waits for a dispatch offer for the staged driver.
6. Accepts the offer through `/v1/driver/me/offers/:offerId/accept`.
7. Progresses the driver job through pickup, drop-off, POD, and delivered.
8. Verifies downstream records:
   - `customer_orders`
   - `customer_order_items`
   - `jobs`
   - `payments`
   - `proof_of_delivery`
   - `job_events`
   - `audit_log`
   - `outbox_messages`
9. Reports the final order, job, payment, POD, outbox, and capture state.

## Expected Passing Output
The command prints concise `PASS` lines and ends with JSON similar to:

```json
{
  "fixture": {
    "orgId": "70d56b02-f2b8-487a-8c97-8e30fd9e631f",
    "driverId": "8a5d2d96-4f0a-4711-b8b0-7ed9478d41a7",
    "vehicleType": "BIKE",
    "availability": "ONLINE"
  },
  "orderId": "...",
  "jobId": "...",
  "offerId": "...",
  "paymentId": "...",
  "podId": "...",
  "finalJobStatus": "DELIVERED",
  "paymentStatus": "CAPTURED",
  "customerOrderItemsCount": 1,
  "jobEventsCount": 5,
  "auditLogCount": 1,
  "outbox": []
}
```

If `paymentStatus` remains `AUTHORIZED`, inspect worker logs and `PAYMENT_CAPTURE_REQUESTED` outbox rows. Delivery should enqueue capture through the existing payment architecture; worker processing is what moves the payment to captured.

## Failure Handling
- `restaurant_menu_empty`: load an active menu for the pilot restaurant before rerunning.
- `poll_timeout:driver_offer`: confirm the staged driver is ONLINE, BIKE, approved, not on another active job, and close to pickup.
- `request_failed:503` from checkout: confirm Render API Stripe test env.
- payment remains `AUTHORIZED`: confirm the worker is running and has Stripe env.
- outbox rows with `last_error`: inspect the exact event type and worker log.

Do not mark Stage 1 paid delivery proven unless both user-visible completion and downstream record integrity are verified.
