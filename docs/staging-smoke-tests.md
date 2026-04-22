# Staging Smoke Tests

## Purpose
Run a repeatable post-deploy check against staging before calling a release healthy.

## Prerequisites
- Staging deploy is live.
- Required migrations are already applied.
- A valid business bearer token is available.
- Smoke env vars are set from `.env.smoke.example`.

## How To Run
```bash
cp .env.smoke.example .env.smoke
set -a
source .env.smoke
set +a
pnpm --filter api smoke:staging
```

## Expected Passing Output
```text
PASS GET /healthz | status=200
PASS GET /readyz | status=200
PASS GET /v1/business/jobs?page=1&limit=20 | status=200
PASS smoke:staging | required checks passed
```

Optional driver and admin checks may print `SKIP` when their tokens are not set.

## Failure Handling
- Any `FAIL` line means staging is not healthy.
- Use the printed response snippet and request id to inspect API logs.
- Fix the issue, redeploy, and rerun the same smoke command.
