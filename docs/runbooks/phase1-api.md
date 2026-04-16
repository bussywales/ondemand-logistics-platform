# Phase 1 API Runbook

## Endpoints

### Create quote
- `POST /v1/quotes`
- Requires: bearer token, `x-idempotency-key`
- Output: persisted pricing snapshot including `pricingVersion`, `premiumDistanceFlag`, totals, and breakdown lines.

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
- Output: `REQUESTED` job with persisted quote snapshot fields.

```bash
curl -X POST "$API_BASE_URL/v1/jobs" \
  -H "authorization: Bearer $CONSUMER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: job-req-001" \
  -d '{
    "consumerId": "'$CONSUMER_USER_ID'",
    "quoteId": "'$QUOTE_ID'",
    "pickupAddress": "101 Main St, London",
    "dropoffAddress": "202 Oak Ave, London",
    "pickupCoordinates": {"latitude": 51.5007, "longitude": -0.1246},
    "dropoffCoordinates": {"latitude": 51.5101, "longitude": -0.1342}
  }'
```

### Update driver availability
- `PATCH /v1/driver/me/availability`
- Requires: driver bearer token, `x-idempotency-key`

```bash
curl -X PATCH "$API_BASE_URL/v1/driver/me/availability" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: driver-availability-001" \
  -d '{"availability":"ONLINE"}'
```

### Update driver location
- `POST /v1/driver/me/location`
- Requires: driver bearer token, `x-idempotency-key`
- Notes: throttled by `DRIVER_LOCATION_THROTTLE_MS`.

```bash
curl -X POST "$API_BASE_URL/v1/driver/me/location" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "content-type: application/json" \
  -H "x-idempotency-key: driver-location-001" \
  -d '{"latitude":51.5002,"longitude":-0.1203}'
```

### List driver offers
- `GET /v1/driver/me/offers`
- Requires: driver bearer token
- Output includes payout, distance, ETA, pickup, and drop before acceptance.

```bash
curl "$API_BASE_URL/v1/driver/me/offers" \
  -H "authorization: Bearer $DRIVER_JWT"
```

### Accept driver offer
- `POST /v1/driver/me/offers/:offerId/accept`
- Requires: driver bearer token, `x-idempotency-key`
- Output includes payout, distance, and ETA snapshot.

```bash
curl -X POST "$API_BASE_URL/v1/driver/me/offers/$OFFER_ID/accept" \
  -H "authorization: Bearer $DRIVER_JWT" \
  -H "x-idempotency-key: driver-offer-accept-001"
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
