# Setup Runbook (Stage 1 Pilot MVP)

## 1) Provision staging infrastructure

### Supabase (staging)
1. Confirm project is active and capture:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (session pooler, Render-safe)
2. Apply repo migrations from:
   - `packages/db/migrations`
3. Current release-critical migrations include:
   - restaurant/menu support
   - customer orders
   - fulfilled order status support
   - notification read state
   - platform admin support

### Upstash Redis (staging)
1. Create Redis database: `ondemand-logistics-staging`
2. Capture:
   - `REDIS_URL`

## 2) Configure staging deploy target

### Render: `api-staging`
- runtime: Node
- region: Frankfurt
- build command: `pnpm install --frozen-lockfile --prod=false && pnpm --filter api build`
- start command: `pnpm --filter api start:prod`
- health check path: `/healthz`
- notes:
  - the outbox worker runs in-process inside the API container on free tier
  - the API must bind `0.0.0.0:${PORT}` before worker startup
- required environment variables:
  - `NODE_ENV=production`
  - `APP_ENV=staging`
  - `PORT=10000`
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY` for local/staging auth fixture seeding
  - `REDIS_URL`
  - `SUPABASE_JWT_AUDIENCE=authenticated`
  - `CORS_ALLOWED_ORIGINS`
  - `CORS_ALLOWED_VERCEL_PROJECTS`
  - `OUTBOX_POLL_INTERVAL_MS=2000`
  - `OUTBOX_BATCH_SIZE=20`
  - `OUTBOX_MAX_RETRIES=10`
  - `DISPATCH_OFFER_TTL_SECONDS=30`
  - `POD_STORAGE_BUCKET=proof-of-delivery`
  - `POD_UPLOAD_URL_TTL_SECONDS=900`
  - `PAYMENT_CURRENCY=gbp`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- optional provider env:
  - `RESEND_API_KEY`
  - `NOTIFICATION_FROM_EMAIL`
  - `NOTIFICATION_REPLY_TO_EMAIL`

### Vercel: `ondemand-logistics-platform-web`
- root directory: repo root (`.`)
- install command: `pnpm install --no-frozen-lockfile`
- build command: `pnpm --filter @shipwright/web build`
- output directory: `apps/web/.next`
- required environment variables:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 3) Business onboarding prerequisites
- browser onboarding uses Supabase email/password auth from the web app
- the frontend then calls the API with the issued bearer token to create the business org and operator membership
- protected routes under `/app` require an authenticated session
- `/admin` additionally requires `PLATFORM_ADMIN`

## 4) Staging verification basics
Expected commands:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
```

### Running release verification
`pnpm release:verify-staging` auto-loads `.env.smoke` when present.

Minimum `.env.smoke`:
```bash
SMOKE_API_BASE_URL=https://api-staging-qvmv.onrender.com
```

Optional `.env.smoke` values:
- `DATABASE_URL`
- `SMOKE_BUSINESS_BEARER_TOKEN`
- `SMOKE_DRIVER_BEARER_TOKEN`
- `SMOKE_ADMIN_BEARER_TOKEN`

Behavior:
- with only `SMOKE_API_BASE_URL`, the command runs `/healthz` and `/readyz`
- with `DATABASE_URL`, it also runs direct schema sanity
- authenticated checks are skipped when the relevant bearer token is absent
- proof artifacts are written to `docs/proofs/`

### Running paid delivery proof
```bash
cp .env.proof.example .env.proof
pnpm proof:staging-paid-delivery
```

Behavior:
- `pnpm proof:staging-paid-delivery` auto-loads `.env.proof` when present
- already-exported env values are preserved
- required baseline env:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `DATABASE_URL`
- conditionally required:
  - `STRIPE_SECRET_KEY` only when `STAGING_PROOF_PROCESS_OUTBOX=true`
- `SUPABASE_SERVICE_ROLE_KEY` is recommended for repeatable fixture creation and required when Supabase signup is rate-limited

Reference:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/staging-paid-delivery-proof.md`

## 5) Protected endpoint fixtures
Seed or refresh staging auth fixtures locally:

```bash
SUPABASE_URL=... \
SUPABASE_ANON_KEY=... \
DATABASE_URL=... \
pnpm fixtures:staging-auth
```

The fixture script creates or reuses:
- `staging-business-operator@shipwright.example.com`
- `staging-driver@shipwright.example.com`
- `staging-consumer@shipwright.example.com`

The staged driver is reset to a dispatch-eligible pilot state:
- `ONLINE`
- approved verification row
- primary `BIKE` vehicle
- latest location close to the pilot restaurant pickup area
- no active job

### Seed a platform admin
`PLATFORM_ADMIN` is a platform-level control-plane role. It is separate from org `ADMIN` and does not grant business-org membership.

Seed one in staging after the Supabase auth user exists:

```sql
insert into public.platform_admins (user_id, is_active)
values ('<supabase-user-id>', true)
on conflict (user_id) do update
set is_active = true,
    updated_at = now();
```

Use that account to access `/admin`.

## 6) Proof archive
Generated evidence is written under:
- `docs/proofs/`

Current artifact types:
- `release-verify-<timestamp>.json`
- `paid-delivery-<timestamp>.json`

Do not edit proof JSON manually. Generate a fresh proof instead.

## 7) Current open setup caveats
- Resend-backed external email delivery is intentionally parked until a verified sender/domain exists
- payout and reconciliation visibility is still incomplete
- customer and operator tracking v1 is still incomplete
- design-system migration is ongoing; customer ordering migrated first, broader shell decomposition remains
