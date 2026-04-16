# Setup Runbook (Phase 3 Payments Foundation MVP)

## 1) Provision staging infrastructure

### Supabase (staging)
1. Confirm project is active and capture:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Session Pooler, Render-safe)
2. Apply SQL migrations in order:
   - `packages/db/migrations/0001_foundations_schema.sql`
   - `packages/db/migrations/0002_rls_policies.sql`
   - `packages/db/migrations/0003_rls_recursion_fix.sql`
   - `packages/db/migrations/0004_phase1_dispatch.sql`
   - `packages/db/migrations/0005_phase2a_reads_and_progression.sql`
   - `packages/db/migrations/0006_phase2b_pod_cancellation_notifications.sql`
   - `packages/db/migrations/0007_phase3_payments_foundation.sql`

### Upstash Redis (staging)
1. Create Redis database: `ondemand-logistics-staging`.
2. Capture:
   - `REDIS_URL`

## 2) Configure staging deploy target

### Render: `api-staging` service
- Runtime: Node
- Region: Frankfurt
- Build command: `pnpm install --frozen-lockfile --prod=false && pnpm --filter api build`
- Start command: `pnpm --filter api start:prod`
- Health check path: `/healthz`
- Notes:
  - The outbox worker runs in-process inside the API container on free tier.
  - The API must bind `0.0.0.0:${PORT}` before worker startup.
- Required environment variables:
  - `NODE_ENV=production`
  - `APP_ENV=staging`
  - `PORT=10000`
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY` for local/staging auth fixture seeding
  - `REDIS_URL`
  - `SUPABASE_JWT_AUDIENCE=authenticated`
  - `OUTBOX_POLL_INTERVAL_MS=2000`
  - `OUTBOX_BATCH_SIZE=20`
  - `OUTBOX_MAX_RETRIES=10`
  - `DISPATCH_OFFER_TTL_SECONDS=30`
  - `POD_STORAGE_BUCKET=proof-of-delivery`
  - `POD_UPLOAD_URL_TTL_SECONDS=900`
  - `PAYMENT_CURRENCY=gbp`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PUBLISHABLE_KEY` only needed later for browser flows

### Vercel: `ondemand-logistics-platform-web`
- Root directory: repo root (`.`)
- Install command: `pnpm install --no-frozen-lockfile`
- Build command: `pnpm --filter @shipwright/web build`
- Output directory: `apps/web/.next`
- Required environment variables:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3) Auth and service-role boundaries

- API verifies Supabase JWTs against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
- All write endpoints require `x-idempotency-key`.
- Direct DB writes happen only in server-side code paths:
  - quote creation
  - job request creation
  - driver availability and location updates
  - offer accept / reject
  - driver status progression transitions
  - proof of delivery upload reservation and record
  - job cancellation
  - payment creation, authorization, webhook reconciliation, refunds, payout readiness
  - outbox worker dispatch / expiry processing
- Read APIs enforce actor visibility in server-side query filters without weakening SQL policies.
- Row-level policies remain defined only in SQL migrations.

## 4) Required staging verification

Run after each deploy:

```bash
curl -fsS https://<api-staging-domain>/healthz
curl -fsS https://<api-staging-domain>/readyz
```

Expected shape:

```json
{"status":"ok","service":"api","requestId":"<uuid>"}
```

## 5) Protected endpoint fixtures

Seed or refresh staging auth fixtures locally:

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
DATABASE_URL=... \
pnpm fixtures:staging-auth
```

The fixture script creates or reuses:
- `staging-business-operator@shipwright.local`
- `staging-driver@shipwright.local`
- `staging-consumer@shipwright.local`

It prints current user ids, the seeded driver id, the seeded org id, and current bearer tokens for sample curls.

## 6) Stripe webhook workflow

Local or staging webhook forwarding:

```bash
stripe listen --forward-to https://<api-staging-domain>/v1/webhooks/stripe
```

Use the signing secret emitted by Stripe CLI or dashboard as `STRIPE_WEBHOOK_SECRET`.

## 7) CI/CD checks

Required GitHub Actions checks:
- `lint`
- `typecheck`
- `test`
- `migration validation`
- `build`

## 8) Constraints enforced in this phase

- Versioned deterministic pricing with quote persistence.
- Single pickup to single drop jobs only.
- Hard distance cap at 12 miles, premium flag for 8-12 miles.
- Driver availability, location, sequential offers, reject-driven redispatch, and guarded status progression.
- Proof of delivery is required before `DELIVERED`.
- Cancellation is restricted to consumer/business actors and pre-drop states only.
- Notification hooks are durable outbox messages; provider fan-out remains deferred.
- Payment provider calls are centralized behind a Stripe abstraction and webhook verification path.
- Payment capture happens only after delivered jobs with POD; payout ledger readiness depends on successful capture.
- Idempotent writes, append-only audit trails, transactional outbox side effects.
- Structured logs with `request_id`; worker failures are non-fatal to HTTP serving.
