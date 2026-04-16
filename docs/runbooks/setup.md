# Setup Runbook (Phase 1 Dispatch MVP)

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
  - `REDIS_URL`
  - `SUPABASE_JWT_AUDIENCE=authenticated`
  - `OUTBOX_POLL_INTERVAL_MS=2000`
  - `OUTBOX_BATCH_SIZE=20`
  - `OUTBOX_MAX_RETRIES=10`
  - `DISPATCH_OFFER_TTL_SECONDS=30`

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
  - driver offer acceptance
  - outbox worker dispatch / expiry processing
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

## 5) CI/CD checks

Required GitHub Actions checks:
- `lint`
- `typecheck`
- `test`
- `migration validation`
- `build`

## 6) Constraints enforced in this phase

- Versioned deterministic pricing with quote persistence.
- Single pickup to single drop jobs only.
- Hard distance cap at 12 miles, premium flag for 8-12 miles.
- Driver availability, location, and sequential dispatch offers.
- Idempotent writes, append-only audit trails, transactional outbox side effects.
- Structured logs with `request_id`; worker failures are non-fatal to HTTP serving.
