# Staging Smoke Tests

## Purpose
Run the low-level authenticated smoke command used by the staging release verification workflow.

Primary operator path:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/release-checklist.md`
- command: `pnpm --filter api verify:staging`

Use `smoke:staging` directly when you only need the HTTP checks without the full operator sequence.

## Prerequisites
- Staging deploy is live.
- Required migrations are already applied.
- A valid business bearer token is available.
- A valid driver bearer token is recommended when you want dispatch-read coverage.
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
PASS GET /v1/driver/me/offers | status=200
PASS smoke:staging | required checks passed
```

Driver and admin checks may print `SKIP` when their tokens are not set.
If `SMOKE_DRIVER_BEARER_TOKEN` is set, the driver offers check becomes part of the required pass set.

## Failure Handling
- Any `FAIL` line means staging is not healthy.
- Use the printed response snippet and request id to inspect API logs.
- Fix the issue, redeploy, and rerun the same smoke command.
