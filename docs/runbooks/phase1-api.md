# API Runbook (Phase 2A)

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
