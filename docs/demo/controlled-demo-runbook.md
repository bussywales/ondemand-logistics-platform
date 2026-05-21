# Controlled Demo Runbook

## Purpose
This runbook is for ShipWright staging demos and tightly managed internal tester sessions.

Use it to:
- confirm staging is healthy before a session
- align the people, accounts, and proof evidence needed for the walkthrough
- keep product claims tied to what is actually proven
- avoid drifting into unsupported pilot promises

This runbook is for controlled staging sessions only. It is not a live public pilot runbook.

## Who Should Attend
Minimum recommended attendees:
- demo owner or facilitator
- operator who can sign into `/app`
- driver fixture operator if `/driver` will be shown live
- platform admin if `/admin` will be shown live
- note taker for issues, questions, and follow-up items

Optional attendees:
- restaurant stakeholder
- internal product/design reviewer
- investor or controlled tester observer

## Staging URLs
Core routes:
- public restaurant ordering: `https://ondemand-logistics-platform-web.vercel.app/restaurants/pilot-kitchen-1777370757`
- public tracking pattern: `https://ondemand-logistics-platform-web.vercel.app/track/<orderId>`
- business workspace: `https://ondemand-logistics-platform-web.vercel.app/app`
- business orders: `https://ondemand-logistics-platform-web.vercel.app/app/orders`
- payment risk: `https://ondemand-logistics-platform-web.vercel.app/app/payments`
- end-of-day report: `https://ondemand-logistics-platform-web.vercel.app/app/reports/end-of-day`
- notifications: `https://ondemand-logistics-platform-web.vercel.app/app/notifications`
- restaurant setup: `https://ondemand-logistics-platform-web.vercel.app/app/restaurant`
- driver route: `https://ondemand-logistics-platform-web.vercel.app/driver`
- admin control plane: `https://ondemand-logistics-platform-web.vercel.app/admin`
- pilot management: `https://ondemand-logistics-platform-web.vercel.app/admin/pilots`
- pilot rehearsal cockpit pattern: `https://ondemand-logistics-platform-web.vercel.app/admin/pilots/<pilotId>/rehearsal`
- controlled pilot packages: `https://ondemand-logistics-platform-web.vercel.app/pricing`
- demo request form: `https://ondemand-logistics-platform-web.vercel.app/demo/request`
- demo request admin review: `https://ondemand-logistics-platform-web.vercel.app/admin/demo-requests`
- help: `https://ondemand-logistics-platform-web.vercel.app/help`

API and health:
- staging API: `https://api-staging-qvmv.onrender.com`
- health: `https://api-staging-qvmv.onrender.com/healthz`
- readiness: `https://api-staging-qvmv.onrender.com/readyz`

## Required Accounts And Roles
Use seeded staging accounts where possible.

Minimum account set:
- business operator for `/app`
- driver account for `/driver`
- platform admin for `/admin`
- public customer flow requires no sign-in, but does require working Stripe test checkout inputs

Recommended seeded roles:
- business operator tied to the pilot org
- approved, online staged driver in the proof fixture
- platform admin seeded in `public.platform_admins`

## Pre-Demo Verification Commands
Run these from the repo root before the session:

```bash
pnpm rehearsal:verify-staging
```

Expected outcome:
- release verification passes
- paid-delivery proof passes
- browser smoke passes for configured public/authenticated staging routes
- required-auth smoke evidence is recorded by the wrapper
- `/admin/release-readiness` reports `READY`, or a `NEEDS_REVIEW` posture is explicitly accepted and explained
- `/admin/validation-evidence` shows current stored release, proof, and required-auth smoke evidence
- latest proof artifacts are written under `docs/proofs/`

Use `demo-reset-checklist.md` for the full reset process before observers join.

## Proof Artifacts To Reference
Reference the latest generated artifacts from `docs/proofs/`.

Minimum recommended evidence:
- latest `release-verify-<timestamp>.json`
- latest `paid-delivery-<timestamp>.json`
- current `/admin/release-readiness` verdict
- latest stored release verification evidence in `/admin/validation-evidence`
- latest stored paid-delivery proof evidence in `/admin/validation-evidence`
- latest stored required-auth smoke evidence in `/admin/validation-evidence`

When presenting proof, call out:
- latest order id
- latest job id
- final `DELIVERED` job state
- final `CAPTURED` payment state
- final `FULFILLED` customer order state
- outbox evidence for notification and payment events
- stored validation evidence is summary-level admin evidence; the UI does not execute release, proof, or smoke commands

Record the latest ids before the session:
- order id
- job id
- payment id
- POD id, if present

## Safe Demo Flow
Recommended order:
1. confirm release verification and proof artifacts exist
2. open the public restaurant menu
3. place a paid order or reference the latest proven order if live ordering is not appropriate for the session
4. show the customer success state
5. open the public tracking route
6. show the business orders queue
7. show the payment risk surface
8. show the end-of-day report
9. show the daily briefing / command-intelligence layer on `/app`
10. show notifications
11. show the driver execution route
12. show the admin control plane
13. show admin command intelligence
14. show `/admin/operational-resets` only if the audience asks how staging/demo clutter is prepared; explain preview, per-record selection, typed confirmation, reset-run evidence, and no hard deletes
15. show pilot management mode, readiness stage, owners, and checklist evidence
16. open `/admin/release-readiness`, `/admin/validation-evidence`, and the selected pilot rehearsal cockpit; confirm stored release/proof/smoke evidence is current or explain any missing/stale posture
17. show soft pilot guardrails on business surfaces; explain that they warn and guide but do not block workflows in v1
18. show `/pricing` as the controlled pilot package page; explain that ShipWright does not publish fake self-serve pricing and starts with fit review
19. show the public demo request form, `/admin/demo-requests`, and the commercial intake signal in `/admin/command`; explain that requests are persisted, internally surfaced for admin review, and still not emailed or CRM-synced yet
20. show help and pilot playbooks
21. close by referencing the proof artifacts and current known limitations

Audience-specific walkthroughs:
- use `investor-walkthrough.md` for investor or strategic partner sessions
- use `pilot-merchant-walkthrough.md` for restaurant or merchant sessions
- use `tester-session-checklist.md` for internal tester sessions

## Session Discipline
Keep the session controlled:
- avoid parallel exploratory clicking during the core walkthrough
- do not let observers steer into unsupported flows mid-demo
- if a route needs a seeded auth session, confirm it before the session starts
- if any proof precheck fails, do not present the system as healthy

## What Not To Promise
Do not claim:
- open public pilot readiness
- unattended real-world reliability
- full payout automation
- autonomous end-of-day closeout or AI-led incident resolution
- live-map courier movement
- outbound email delivery as proven unless Resend sender/domain is verified and separately proven
- CRM automation for demo requests; internal admin command/outbox visibility, owner assignment, follow-up scheduling, contact recording, event history, and optional webhook/admin-email notification delivery are available, but outbound follow-up remains manual unless configured and separately proven
- notification delivery posture is visible to platform admins; skipped/unconfigured demo request notifications are acceptable when optional webhook/email secrets are intentionally absent
- public fixed-price packages; `/pricing` explains controlled pilot paths and pricing is discussed after fit review
- operational reset as deletion; reset tools are non-destructive, admin-only, previewed first, and do not mutate proof orders/jobs/payments
- broad compliance completeness for live courier operations
- settlement or reconciliation automation beyond the current visibility surfaces
- pilot mode as an automatic operating control; it is a human-reviewed readiness layer in v1
- pilot guardrails as hard enforcement; they are soft warnings in v1
- the rehearsal cockpit as proof execution; it is a read-only readiness cockpit and validation commands still run outside the UI
- stored validation evidence as full proof artifacts; it stores summary/status/IDs while JSON proof artifacts remain local and uncommitted unless intentionally exported

When Command Intelligence is shown, describe it as:
- deterministic
- rules-based
- based on current operational signals
- human-in-the-loop
- cross-org for platform admins when shown in `/admin/command`

Do not describe it as:
- self-driving operations
- automatic decisioning
- autonomous recovery

## Escalation During Demo
If something fails during the session:
- stop the live claim immediately
- switch to the latest proof artifact and explain the exact boundary
- use `docs/playbooks/` for operator recovery paths
- log the failure with screenshots, ids, route, timestamp, and the impacted role
