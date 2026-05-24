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
- public site: `https://ondemand-logistics-platform-web.vercel.app/`
- controlled pilot packages: `https://ondemand-logistics-platform-web.vercel.app/pricing`
- demo request form: `https://ondemand-logistics-platform-web.vercel.app/demo/request`
- public restaurant ordering: `https://ondemand-logistics-platform-web.vercel.app/restaurants/pilot-kitchen-1777370757`
- public tracking pattern: `https://ondemand-logistics-platform-web.vercel.app/track/<orderId>`
- business workspace: `https://ondemand-logistics-platform-web.vercel.app/app`
- business orders: `https://ondemand-logistics-platform-web.vercel.app/app/orders`
- payment risk: `https://ondemand-logistics-platform-web.vercel.app/app/payments`
- business finance: `https://ondemand-logistics-platform-web.vercel.app/app/finance`
- end-of-day report: `https://ondemand-logistics-platform-web.vercel.app/app/reports/end-of-day`
- notifications: `https://ondemand-logistics-platform-web.vercel.app/app/notifications`
- restaurant setup: `https://ondemand-logistics-platform-web.vercel.app/app/restaurant`
- driver route: `https://ondemand-logistics-platform-web.vercel.app/driver`
- admin control plane: `https://ondemand-logistics-platform-web.vercel.app/admin`
- admin command: `https://ondemand-logistics-platform-web.vercel.app/admin/command`
- pilot management: `https://ondemand-logistics-platform-web.vercel.app/admin/pilots`
- pilot rehearsal cockpit pattern: `https://ondemand-logistics-platform-web.vercel.app/admin/pilots/<pilotId>/rehearsal`
- demo request admin review: `https://ondemand-logistics-platform-web.vercel.app/admin/demo-requests`
- release readiness: `https://ondemand-logistics-platform-web.vercel.app/admin/release-readiness`
- validation evidence: `https://ondemand-logistics-platform-web.vercel.app/admin/validation-evidence`
- admin finance: `https://ondemand-logistics-platform-web.vercel.app/admin/finance`
- dispatch audit: `https://ondemand-logistics-platform-web.vercel.app/admin/dispatch-audit`
- operational reset tools: `https://ondemand-logistics-platform-web.vercel.app/admin/operational-resets`
- product analytics: `https://ondemand-logistics-platform-web.vercel.app/admin/analytics`
- notification diagnostics: `https://ondemand-logistics-platform-web.vercel.app/admin/notifications`
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
1. confirm `pnpm rehearsal:verify-staging` passed and stored evidence is fresh
2. open the public site and explain the controlled-pilot product story
3. open `/pricing` and explain pilot packages without fake self-serve pricing
4. show `/demo/request`, then `/admin/demo-requests` for follow-up workflow
5. show pilot workspace readiness, guardrails, and the selected rehearsal cockpit
6. show restaurant/menu setup, menu history, availability, order controls, and rollback preview/confirmation
7. place a paid public order or reference the latest proven order if live ordering is not appropriate
8. show customer success and public tracking
9. show business orders, jobs, support escalation, and dispatch governance
10. show finance visibility and persistent finance review handling
11. show `/admin/dispatch-audit` for read-only assignment accountability
12. show daily briefing, end-of-day report, and admin command posture
13. open `/admin/release-readiness` and `/admin/validation-evidence`; confirm stored release/proof/smoke evidence is current or explain any missing/stale posture
14. show `/admin/operational-resets` only if the audience asks how staging/demo clutter is prepared; explain preview, per-record selection, typed confirmation, reset-run evidence, and no hard deletes
15. show `/admin/analytics` and `/admin/notifications` if commercial or operational diagnostics are in scope
16. show help and pilot playbooks
17. close by referencing proof artifacts and current known limitations

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
- automated refunds
- autonomous dispatch decisions
- autonomous end-of-day closeout or AI-led incident resolution
- live impersonation
- SSO/SCIM
- live-map courier movement
- outbound email delivery as proven unless Resend sender/domain is verified and separately proven
- CRM automation for demo requests; internal admin command/outbox visibility, owner assignment, follow-up scheduling, contact recording, event history, and optional webhook/admin-email notification delivery are available, but outbound follow-up remains manual unless configured and separately proven
- external analytics or invasive public tracking; ShipWright uses first-party funnel events only, does not store raw IP addresses or raw user agents, and analytics failure must not block demo request submission
- notification delivery posture is visible to platform admins in `/admin/notifications`, `/admin/demo-requests`, and `/admin/command`; skipped/unconfigured demo request, invite, or test notifications are acceptable when optional webhook/email secrets are intentionally absent
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
