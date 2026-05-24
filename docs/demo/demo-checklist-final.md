# ShipWright Final Demo Checklist

Use this checklist before investor, merchant, or operator demos.

## Required pre-demo checks
- Run `pnpm rehearsal:verify-staging` from the repo root.
- Confirm `/admin/release-readiness` is `READY`.
- Confirm required-auth smoke passed `7/7`.
- Confirm `/admin/validation-evidence` shows fresh records for:
  - release verification
  - paid-delivery proof
  - required-auth smoke
- Confirm latest proof IDs are recorded:
  - order id
  - job id
  - payment id
  - POD id
- Confirm staging web is deployed from latest `main`.
- Confirm seeded business, admin, driver, and fleet-manager accounts work if those flows will be shown.
- Confirm proof artifacts remain local/uncommitted.
- Confirm no secrets are present in committed files.

## Route readiness checklist
Open or verify these before observers join:
- `/`
- `/pricing`
- `/demo/request`
- `/admin/release-readiness`
- `/admin/validation-evidence`
- `/admin/command`
- `/app/restaurant`
- `/restaurants/pilot-kitchen-1777370757`
- `/app/jobs`
- `/app/finance`
- `/admin/finance`
- `/admin/dispatch-audit`
- `/admin/governance`

## Proof point checklist
Be ready to show or explain:
- release readiness is `READY`
- validation evidence is fresh
- paid-delivery proof completed
- support escalation audit exists for human follow-up
- dispatch governance records manual review and assignment decisions
- finance review tracks manual financial decisions without refund automation
- menu rollback requires preview and typed confirmation
- fleet readiness is visibility and compliance context, not scoring

## Audience-specific pack
Use the right pack:
- investor: `docs/demo/investor-demo-pack.md`
- pilot merchant: `docs/demo/pilot-merchant-demo-pack.md`
- operator partner: `docs/demo/operator-demo-pack.md`
- shared talk track: `docs/demo/demo-talk-track.md`

## Honest limitations checklist
Say these clearly when relevant:
- no autonomous refunds
- no payout automation
- no CRM sync
- no autonomous dispatch
- no live impersonation
- no SSO/SCIM
- notification delivery requires configured env
- proof artifacts remain local/uncommitted

## During demo
- Keep one facilitator driving.
- Keep one note taker capturing route, timestamp, role, and issue details.
- Do not improvise unsupported flows.
- If a route is slow, explain staging/cold-start context and use latest proof-backed state.
- If a route fails, stop the claim and switch to evidence.

## After demo
- Record attendees and audience type.
- Record proof IDs used.
- Record questions and objections.
- Log any product issue with screenshots and IDs.
- Decide whether another `pnpm rehearsal:verify-staging` run is needed before the next session.
