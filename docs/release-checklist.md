# Staging Release Verification Runbook

This is the operator path for declaring a staging Shipwright release healthy.

## 1) Apply Migrations First
- Apply the required staging SQL migrations before deploy.
- Do not start verification against a deploy that points at a stale database schema.
- If `/readyz` reports `schema_compatibility_not_ready`, treat that as a migration or schema drift issue and stop the release.

## 2) Deploy
- Trigger the staging deploy.
- Wait for the platform to mark the deploy live.
- Record:
  - deployed commit sha
  - deploy id or staging deploy URL

## 3) Run The Verification Command
Use the single operator command below after the deploy is live.

```bash
cp .env.smoke.example .env.smoke
set -a
source .env.smoke
set +a
pnpm --filter api verify:staging
```

The command runs the release-critical verification sequence in order:
1. operator reminder to confirm migrations were applied
2. operator reminder to confirm deploy is live
3. `GET /healthz`
4. `GET /readyz`
5. authenticated business smoke:
   - `GET /v1/business/jobs?page=1&limit=20`
6. optional authenticated driver/dispatch smoke when `SMOKE_DRIVER_BEARER_TOKEN` is set:
   - `GET /v1/driver/me/offers`
7. release decision

## 4) Required Pass Conditions
- `GET /healthz` returns `200`
- `GET /readyz` returns `200`
- authenticated business smoke passes
- if `SMOKE_DRIVER_BEARER_TOKEN` is set, driver offers smoke must also pass
- release is not healthy if any required check fails

## 5) Readiness Failure Meaning
`/healthz` is liveness-only.

`/readyz` includes:
- database connectivity
- schema compatibility for the current critical flows:
  - quotes
  - jobs and tracking
  - driver offers / dispatch reads
  - payments

If required tables or columns are missing, `/readyz` returns `503` with:

```json
{
  "status": "error",
  "service": "api",
  "message": "schema_compatibility_not_ready",
  "missingElements": ["public.jobs.quote_id", "public.payments.created_at"]
}
```

If the database itself is unavailable, `/readyz` returns:

```json
{
  "status": "error",
  "service": "api",
  "message": "database_not_ready"
}
```

## 6) Frontend Auth Restore Fail-Closed
The web app now fails closed if the authenticated workspace restore stalls.

Current behavior:
- `/app` can be entered by the lightweight app auth cookie
- the browser then restores the real Supabase session and business context
- if session restore or business context fetch stalls past the timeout, the app:
  - clears the cached business session
  - clears the `shipwright-app-auth` cookie
  - redirects back to `/get-started`

Where to look when users are redirected out of `/app`:
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/business-auth-provider.tsx`
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_lib/auth.ts`

Primary checks:
- verify `NEXT_PUBLIC_SUPABASE_URL`
- verify `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- verify `NEXT_PUBLIC_API_BASE_URL`
- check browser network calls for:
  - Supabase session restore
  - `GET /v1/business/context`
- check whether `/v1/business/context` is timing out or failing

This redirect is intentional fail-closed behavior, not a silent success path.

## 7) Evidence To Record
- deployed commit sha
- deploy id or staging deploy URL
- migration confirmation
- `healthz` result
- `readyz` result
- verify command output
- any request ids from failed checks

## 8) Next Hardening Candidate
Next likely high-risk endpoint family:
- operator dispatch mutations

Why:
- state-changing retry / reassign actions
- idempotency and ownership checks
- side effects in outbox and offer state transitions
- higher risk than the read-only driver offers smoke

Do not harden this in this phase. Treat it as the next operational hardening target after the current driver offers / dispatch read coverage.
