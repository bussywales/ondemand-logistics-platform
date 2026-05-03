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
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
```

Expected outcome:
- release verification passes
- paid-delivery proof passes
- latest proof artifacts are written under `docs/proofs/`

## Proof Artifacts To Reference
Reference the latest generated artifacts from `docs/proofs/`.

Minimum recommended evidence:
- latest `release-verify-<timestamp>.json`
- latest `paid-delivery-<timestamp>.json`

When presenting proof, call out:
- latest order id
- latest job id
- final `DELIVERED` job state
- final `CAPTURED` payment state
- final `FULFILLED` customer order state
- outbox evidence for notification and payment events

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
9. show notifications
10. show the driver execution route
11. show the admin control plane
12. show help and pilot playbooks
13. close by referencing the proof artifacts and current known limitations

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
- broad compliance completeness for live courier operations
- settlement or reconciliation automation beyond the current visibility surfaces

## Escalation During Demo
If something fails during the session:
- stop the live claim immediately
- switch to the latest proof artifact and explain the exact boundary
- use `docs/playbooks/` for operator recovery paths
- log the failure with screenshots, ids, route, timestamp, and the impacted role
