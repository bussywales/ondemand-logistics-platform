# Staging Release Checklist

## Pre-deploy
- Confirm the target commit and staging environment are correct.
- Confirm required staging environment variables are present.
- Apply required database migrations before deploy.
- Do not start release verification until the deploy target has picked up the intended commit.

## Deploy
- Trigger the staging deploy.
- Wait until the deploy is marked live by the hosting platform.
- Record the deployed commit sha and deploy id or URL.

## Post-deploy Verification
- `GET /healthz` returns `200`.
- `GET /readyz` returns `200`.
- Run the authenticated staging smoke command.
- Confirm the authenticated business smoke passes for `GET /v1/business/jobs?page=1&limit=20`.
- Treat any failed check as a failed release verification.

## Release Decision
- Mark staging healthy only if deploy live state, health endpoints, and authenticated smoke checks all pass.
- Do not mark a release healthy if any required check fails.
- If a required check fails, capture evidence, fix the issue, redeploy, and rerun the full checklist.

## Evidence To Record
- Deployed commit sha.
- Deploy id or staging deploy URL.
- Migration command or note confirming migrations were applied.
- `healthz` result.
- `readyz` result.
- Smoke command output, including any request ids from failures.
