# API Runbook (Phase 3)

## Auth fixtures

Seed or refresh staging auth fixtures:

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
DATABASE_URL=... \
pnpm fixtures:staging-auth
```

The script prints:
- `BUSINESS_OPERATOR_JWT`
- `DRIVER_JWT`
- `CONSUMER_JWT`
- `ORG_ID`
- `DRIVER_ID`
- `CONSUMER_USER_ID`

## Business onboarding flow

### Create or resume business org context

Read current business context:

```bash
curl "$API_BASE_URL/v1/business/context" \
  -H "authorization: Bearer $BUSINESS_OPERATOR_JWT"
```

Create the business org and operator membership for the authenticated user:

```bash
curl -X POST "$API_BASE_URL/v1/business/orgs" \
  -H "authorization: Bearer $BUSINESS_OPERATOR_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: business-org-001" \
  -d '{
    "businessName": "ShipWright Retail Ops",
    "contactName": "Busayo Adewale",
    "email": "staging-business-operator@shipwright.local",
    "phone": "+44 20 7946 0958",
    "city": "London"
  }'
```

Expected result:
- `currentOrg` is populated
- `memberships[0].membership.role = BUSINESS_OPERATOR`
- subsequent business job reads use that org-backed access automatically in the web app

## Core write flow

### Create quote
- `POST /v1/quotes`
- Requires: bearer token, `x-idempotency-key`

```bash
curl -X POST "$API_BASE_URL/v1/quotes" \
  -H "authorization: Bearer $CONSUMER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: quote-req-001" \
  -d '{
    "distanceMiles": 7.4,
    "etaMinutes": 21,
    "vehicleType": "BIKE",
    "timeOfDay": "LUNCH",
    "demandFlag": false,
    "weatherFlag": false
  }'
```

### Create job request
- `POST /v1/jobs`
- Requires: bearer token, `x-idempotency-key`, valid `quoteId`
- Side effects:
  - creates internal payment record
  - enqueues Stripe payment-intent creation if Stripe is configured

For an onboarded business operator, `consumerId` is optional and defaults to the authenticated actor.

```bash
curl -X POST "$API_BASE_URL/v1/jobs" \
  -H "authorization: Bearer $BUSINESS_OPERATOR_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: job-req-001" \
  -d '{
    "orgId": "'$ORG_ID'",
    "quoteId": "'$QUOTE_ID'",
    "pickupAddress": "101 Main St, London",
    "dropoffAddress": "202 Oak Ave, London",
    "pickupCoordinates": {"latitude": 51.5007, "longitude": -0.1246},
    "dropoffCoordinates": {"latitude": 51.5101, "longitude": -0.1342}
  }'
```

## Driver offer flow

### Update driver availability
```bash
curl -X PATCH "$API_BASE_URL/v1/driver/me/availability" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: driver-availability-001" \
  -d '{"availability":"ONLINE"}'
```

### Update driver location
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/location" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: driver-location-001" \
  -d '{"latitude":51.5002,"longitude":-0.1203}'
```

### List driver offers
```bash
curl "$API_BASE_URL/v1/driver/me/offers" \
  -H "authorization: Bearer $DRIVER_JWT"
```

### Accept driver offer
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/offers/$OFFER_ID/accept" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: driver-offer-accept-001"
```

### Reject driver offer
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/offers/$OFFER_ID/reject" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: driver-offer-reject-001"
```

### Cancel job
```bash
curl -X POST "$API_BASE_URL/v1/jobs/$JOB_ID/cancel" \
  -H "authorization: Bearer $CONSUMER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: job-cancel-001" \
  -d '{
    "reason": "Store closed early",
    "settlementPolicyCode": "PENDING_PAYMENT_RULES",
    "settlementNote": "No payment capture yet"
  }'
```

## Read APIs

### Read a single job
```bash
curl "$API_BASE_URL/v1/jobs/$JOB_ID" \
  -H "authorization: Bearer $CONSUMER_JWT"
```

### Business job list
```bash
curl "$API_BASE_URL/v1/business/jobs?page=1&limit=20" \
  -H "authorization: Bearer $BUSINESS_OPERATOR_JWT"
```

### Driver current job
```bash
curl "$API_BASE_URL/v1/driver/me/jobs/current" \
  -H "authorization: Bearer $DRIVER_JWT"
```

### Driver job history
```bash
curl "$API_BASE_URL/v1/driver/me/jobs/history?page=1&limit=20" \
  -H "authorization: Bearer $DRIVER_JWT"
```

### Tracking view
```bash
curl "$API_BASE_URL/v1/jobs/$JOB_ID/tracking" \
  -H "authorization: Bearer $CONSUMER_JWT"
```

### Payment summary
```bash
curl "$API_BASE_URL/v1/jobs/$JOB_ID/payment" \
  -H "authorization: Bearer $CONSUMER_JWT"
```

### Payment authorize
```bash
curl -X POST "$API_BASE_URL/v1/jobs/$JOB_ID/payment/authorize" \
  -H "authorization: Bearer $CONSUMER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: payment-authorize-001" \
  -d '{
    "paymentMethodId": "pm_card_visa"
  }'
```

## Driver status progression

### ASSIGNED -> EN_ROUTE_PICKUP
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/en-route-pickup" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: job-status-001"
```

### EN_ROUTE_PICKUP -> PICKED_UP
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/picked-up" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: job-status-002"
```

### PICKED_UP -> EN_ROUTE_DROP
```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/en-route-drop" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: job-status-003"
```

### EN_ROUTE_DROP -> DELIVERED
First reserve or decide the photo location:

```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/proof-of-delivery/upload-url" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: pod-upload-001"
```

Then record proof of delivery:

```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/proof-of-delivery" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: pod-record-001" \
  -d '{
    "photoUrl": "'$PHOTO_URL'",
    "recipientName": "Alex",
    "deliveryNote": "Left with front desk",
    "coordinates": {"latitude": 51.5101, "longitude": -0.1342},
    "otpVerified": false
  }'
```

Only after POD exists:

```bash
curl -X POST "$API_BASE_URL/v1/driver/me/jobs/$JOB_ID/delivered" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: job-status-004"
```

## Worker log progression

Expected healthy in-process worker logs on staging:
- `worker_started`
- `worker_poll_tick`
- `worker_db_connect_ok`
- `worker_session_init_ok`
- `worker_idle`

Dispatch-specific logs:
- `dispatch_offer_created`
- `dispatch_no_candidate`
- `outbox_dispatch_success`

Payment-specific logs:
- `PAYMENT_INTENT_CREATE_REQUESTED`
- `PAYMENT_CAPTURE_REQUESTED`
- `PAYMENT_CANCELLATION_SETTLEMENT_REQUESTED`

## Payment state machine

- `REQUIRES_PAYMENT_METHOD`: internal payment exists, no authorized funds yet
- `REQUIRES_CONFIRMATION`: payment intent exists but still needs confirmation work
- `AUTHORIZED`: Stripe manual-capture authorization is in place
- `CAPTURED`: funds captured after delivery completion
- `PARTIALLY_REFUNDED`: some captured funds refunded
- `REFUNDED`: captured funds fully refunded
- `FAILED`: provider authorization or reconciliation failed
- `CANCELLED`: authorization or intent cancelled without capture

## Cancellation settlement matrix

- `REQUESTED` or `DISPATCH_FAILED`
  - code: `BEFORE_ASSIGNMENT_FULL_RELEASE`
  - customer retained: `0`
  - refund: full captured amount
  - payout impact: `0`
- `ASSIGNED` or `EN_ROUTE_PICKUP`
  - code: `AFTER_ASSIGNMENT_CANCELLATION_FEE`
  - customer retained: cancellation fee policy, collected only if payment is authorizable/captured
  - refund: captured minus fee
  - payout impact: snapshot only for now, no payout ledger entry
- `PICKED_UP` or later
  - code: `IN_PROGRESS_MANUAL_REVIEW`
  - cancellation endpoint remains blocked
  - settlement logic is reserved for manual review paths

## Stripe webhook route

```bash
stripe listen --forward-to "$API_BASE_URL/v1/webhooks/stripe"
```

Stripe events handled idempotently:
- `payment_intent.succeeded`
- `payment_intent.amount_capturable_updated`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `refund.updated`

## Payout readiness

- Successful delivery plus successful payment capture creates or updates a `payout_ledger` row in `READY`
- Cancelled or unpaid jobs do not create payout readiness entries
- Actual bank payout automation remains out of scope for this phase
