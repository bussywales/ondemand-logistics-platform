# Setup Runbook (Phase 0 Foundations)

## 1) Provision staging infrastructure

### Supabase (staging)
1. Create project: `ondemand-logistics-staging`.
2. Capture:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Postgres `DATABASE_URL`
3. Apply SQL migrations in order:
   - `packages/db/migrations/0001_foundations_schema.sql`
   - `packages/db/migrations/0002_rls_policies.sql`

### Upstash Redis (staging)
1. Create Redis database: `ondemand-logistics-staging`.
2. Capture:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2) Configure staging deploy targets

### Render: `api-staging` service
- Runtime: Node
- Build command: `pnpm install --no-frozen-lockfile && pnpm --filter @shipwright/api build`
- Start command: `pnpm --filter @shipwright/api start`
- Health check path: `/healthz`
- Required environment variables:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `DATABASE_URL` (Supabase Postgres)
  - `SUPABASE_URL`
  - `SUPABASE_JWT_AUDIENCE=authenticated`

### Render: `worker-staging` service
- Runtime: Node
- Build command: `pnpm install --no-frozen-lockfile && pnpm --filter @shipwright/worker build`
- Start command: `pnpm --filter @shipwright/worker start`
- Required environment variables:
  - `NODE_ENV=production`
  - `DATABASE_URL` (Supabase Postgres)
  - `OUTBOX_POLL_INTERVAL_MS=2000`
  - `OUTBOX_BATCH_SIZE=20`
  - `OUTBOX_MAX_RETRIES=10`

### Vercel: `web-staging` project
- Root directory: `apps/web`
- Build command: `pnpm --filter @shipwright/web build`
- Install command: `pnpm install --no-frozen-lockfile`
- Required environment variables:
  - `NEXT_PUBLIC_API_BASE_URL` (Render API staging URL)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3) Auth and service-role boundaries

- API verifies Supabase JWTs against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
- API runs with `DATABASE_URL` and only uses service-level database access in explicit modules:
  - transactional write endpoint in `apps/api/src/foundations/foundations.service.ts`
  - outbox worker in `apps/worker/src/index.ts`
- Row-level policies remain enforced for authenticated paths in SQL migrations.

## 4) Required endpoint verification (staging)

Run after deployment:

```bash
curl -fsS https://<api-staging-domain>/healthz
curl -fsS https://<api-staging-domain>/readyz
```

Expected shape:

```json
{"status":"ok","service":"api","requestId":"<uuid>"}
```

## 5) CI/CD secrets

Add these GitHub repository secrets:
- `TEST_DATABASE_URL` (staging/fresh integration DB)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 6) Constraints enforced in this phase

- Server-side RBAC + Supabase JWT verification.
- Postgres RLS policies in migrations only.
- Idempotency key required for every write route.
- Outbox for side effects with SKIP LOCKED worker processing.
- Append-only `job_events` and `audit_log`.
- Structured logs with `request_id`; global exception filter prevents swallowed errors.
