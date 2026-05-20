# ShipWright (Stage 1 Pilot MVP)

ShipWright is evolving from a Stage 1 pilot logistics platform into an AI-assisted logistics command centre for local commerce.

Technical note:
- the repository and some package or workspace identifiers still retain older technical names such as `ondemand-logistics-platform`
- the external product name is **ShipWright**
- this pass does not rename repo, package, or deploy identifiers where that could break tooling

Current repo state is beyond foundations-only work. The platform now includes a real staged spine for:
- public restaurant ordering
- Stripe-backed customer payment authorization
- business order visibility
- dispatch and job lifecycle handling
- driver offer and execution flow
- proof of delivery and delivered completion
- payment capture after delivery
- terminal customer order state as `FULFILLED`
- admin control plane, business notifications, help, product updates, and staging proof tooling

This is still a controlled pilot system, not a production-scale marketplace. AI-assisted command-centre capabilities are a roadmap direction, not a current autonomous product claim.

## Core guarantees
- server-side RBAC
- Postgres RLS
- strict database constraints
- idempotent writes
- transactional outbox
- append-only audit and event logs
- structured logging with `request_id`
- no silent failures

## Monorepo layout
- `apps/api` - NestJS API
- `apps/worker` - outbox worker with `FOR UPDATE SKIP LOCKED`
- `apps/web` - Next.js product surfaces
- `packages/db` - SQL migrations and DB checks
- `packages/contracts` - shared Zod contracts
- `packages/observability` - logging and request context helpers
- `packages/payments` - payment helpers and shared payment logic

## Current Stage 1 product surfaces
- Public customer ordering route: `/restaurants/[slug]`
- Business workspace: `/app`
- Business orders: `/app/orders`
- Driver execution route: `/driver`
- Admin control plane: `/admin`
- Admin pilot management: `/admin/pilots`
- Admin identity and access: `/admin/users`, `/admin/orgs`, `/admin/orgs/[orgId]/members`
- Admin driver fleet organisations: `/admin/fleets`
- Admin demo requests: `/admin/demo-requests`
- Admin operational reset tools: `/admin/operational-resets`
- Fleet manager workspace: `/fleet`
- Business team settings: `/app/settings/team`
- Help centre: `/help`
- Product updates: `/app/updates`, `/driver/updates`, `/admin/updates`

## Commercial intake
Public demo and controlled-pilot requests are captured through:
- `/pricing`
- `/demo/request`
- API: `POST /v1/demo-requests`
- admin review: `/admin/demo-requests`

`/pricing` is positioned as **Controlled pilot packages**, not a public self-serve pricing table. It explains merchant, operator/platform, and investor/partner pilot paths without inventing public prices.

Demo request capture is persistence-only in v1. It does not send email, sync a CRM, or promise automatic follow-up.

Commercial intake v2 adds internal operational visibility:
- new demo requests record an internal `NOTIFY_ADMIN_DEMO_REQUEST_CREATED` outbox event
- `/admin` and `/admin/command` surface new request posture for platform admins
- `/admin/demo-requests` provides next-action guidance, reviewed metadata, status quick actions, and admin notes

Commercial intake v4 adds follow-up pipeline preparation:
- platform admins can assign an owner, set priority, schedule next follow-up, record contact, and close leads with reason
- demo request history is append-only through `demo_request_events`
- admin updates can enqueue internal automation-prep events for future email/webhook/CRM work

Demo request/admin notification outbox events can optionally deliver to configured channels:
- `DEMO_REQUEST_WEBHOOK_URL` posts structured admin demo-request payloads to an external webhook
- `ADMIN_NOTIFICATION_EMAIL` sends admin notification email when `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` are also configured
- when no webhook/email channel is configured, the worker records the notification as skipped/deferred and demo request persistence is not blocked

CRM sync and automated follow-up delivery remain deferred.

## Operational Reset Tools
`/admin/operational-resets` provides platform-admin-only staging/demo tidy controls.

Reset tools are deliberately non-destructive:
- previews run before execution
- execution requires typed confirmation: `RESET DEMO DATA`
- reset runs and affected items are recorded
- old demo requests may be closed/archived
- clearly marked test/demo support escalations may be resolved with reset closeout evidence
- stale pilot rehearsal state is reported as a recommendation in v1
- paid-delivery proof orders, jobs, payments, audit history, and proof artifacts are not deleted or mutated

## What’s New Entries
Product update entries live in:
- `apps/web/app/_content/product-updates.ts`

For major user-visible delivery work, add a concise operator-facing entry with:
- title
- short summary
- audience
- release date/version when used
- CTA label and link when relevant

If no What’s New entry is needed, note the reason in the release notes.

## Key commands
```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test
pnpm --filter api test
pnpm typecheck
pnpm --filter @shipwright/web test:smoke
```

The required staging-ready quality gate is documented in `docs/validation/staging-validation-standard.md`.

Validation evidence can be stored for admin rehearsal review after successful gates:

```bash
RECORD_VALIDATION_EVIDENCE=true pnpm release:verify-staging
RECORD_VALIDATION_EVIDENCE=true pnpm proof:staging-paid-delivery
pnpm evidence:record -- --type PLAYWRIGHT_SMOKE_REQUIRED_AUTH --status PASSED --source playwright_smoke --command "SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke" --summary-json '{"passed":7,"failed":0}'
```

Stored evidence is visible at `/admin/validation-evidence` and in pilot rehearsal cockpits. It stores summary IDs/status, not secrets; proof JSON artifacts remain local and uncommitted.

## Browser smoke testing (Playwright)
Commit `4975b8c` adds a minimal Playwright setup for staging smoke checks.

```bash
pnpm --filter @shipwright/web exec playwright install chromium
pnpm --filter @shipwright/web test:e2e
pnpm --filter @shipwright/web test:smoke
```

Notes:
- Public restaurant smoke flow runs without authentication.
- Tracking smoke needs an order id:
  - `SMOKE_LATEST_ORDER_ID` (preferred), or
  - `LATEST_ORDER_ID` fallback.
- Authenticated workspace/admin/driver/fleet-manager smoke checks require credentials and are skipped if missing.
- The Playwright config auto-loads repo-root `.env.smoke` when present.
- Set `SMOKE_REQUIRE_AUTH=true` for release/full smoke mode; missing tracking or authenticated smoke credentials fail instead of skipping.
- Playwright artifacts are local test outputs and must not be committed:
  - `playwright-report`
  - `test-results`

Optional authenticated smoke env vars in the Playwright spec:
- `SMOKE_BUSINESS_EMAIL`, `SMOKE_BUSINESS_PASSWORD`
- `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD`
- `SMOKE_DRIVER_EMAIL`, `SMOKE_DRIVER_PASSWORD`
- `SMOKE_FLEET_MANAGER_EMAIL`, `SMOKE_FLEET_MANAGER_PASSWORD`

Global run env:
- `STAGING_WEB_BASE_URL` (set to staging host for authenticated and public smoke routes)
- `SMOKE_REQUIRE_AUTH=true` when the release gate must prove authenticated browser coverage

## Migrations
The schema has moved well beyond the original foundations migrations.

See the full migration history in:
- `packages/db/migrations`

Current release-critical migrations include restaurant/menu, customer orders, fulfilled order state, notification read state, platform admin support, and identity/team management.
Pilot management schema now tracks workspace mode, readiness stage, owners, readiness checklist evidence, and posture counts for admin-led controlled pilot review.
Driver fleet organisations reuse the IAM organisation and membership model with `DRIVER_COMPANY` orgs and fleet roles; v1 is readiness/management visibility only, not fleet billing, payout, dispatch preference, or courier suspension automation.

## Strategic direction
- current state: operational delivery and dispatch foundations
- near-term direction: operator-first AI assistance for briefing, triage, recovery, and summaries
- later direction: recommendation systems with human approval
- deferred: high-risk automation without operator review

## Current Stage 1 evidence
- Proof archive: `docs/proofs/`
- Staging validation standard: `docs/validation/staging-validation-standard.md`
- Paid delivery proof runbook: `docs/staging-paid-delivery-proof.md`
- Release verification runbook: `docs/release-checklist.md`
- Working execution plan: `docs/roadmaps/fleet-pilot-working-plan.md`
- Design system authority: `docs/design-system.md`

## Runbooks
- `docs/runbooks/setup.md` - staging setup, env, fixture, and verification flow
- `docs/staging-paid-delivery-proof.md` - full paid order to delivered proof runbook
- `docs/release-checklist.md` - staging release verification and readiness gate

## Demo And Tester Guides
- `docs/demo/README.md` - index for controlled demo and tester session guides
- `docs/demo/controlled-demo-runbook.md` - controlled staging demo preparation and guardrails
- `docs/demo/demo-script.md` - live walkthrough sequence for demos
- `docs/demo/investor-walkthrough.md` - investor-focused route order, talk track, proof framing, and claims boundaries
- `docs/demo/pilot-merchant-walkthrough.md` - pilot merchant walkthrough for setup, orders, tracking, payments, and support
- `docs/demo/demo-reset-checklist.md` - repeatable pre-demo reset, proof id capture, route check, and cold-start fallback checklist
- `docs/demo/demo-known-limitations-talk-track.md` - calm Q&A language for current staging limitations
- `docs/demo/tester-session-checklist.md` - before/during/after checklist for internal tester sessions
- `docs/demo/known-limitations.md` - claims boundary and current limitations

Minimum demo readiness standard:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test:smoke
```

Before a demo, record the latest proof order/job/payment/POD ids and keep the latest `docs/proofs/release-verify-*.json` and `docs/proofs/paid-delivery-*.json` paths available.

## Roadmaps
- `docs/roadmaps/shipwright-roadmap.md` - canonical roadmap order across pilot readiness, What’s New discipline, IAM, merchant menu operations, driver fleets, commercial conversion, and brand work
- `docs/roadmaps/fleet-roadmap.md` - legacy roadmap filename for the core ShipWright delivery plan
- `docs/roadmaps/fleet-scope-cut-matrix.md` - build, buy, manual, and defer decisions by stage
- `docs/roadmaps/fleet-pilot-working-plan.md` - Stage 1 execution status and priorities
- `docs/roadmaps/fleet-pilot-readiness-checklist.md` - pilot gate split into staging-proof and live-pilot readiness
- `docs/roadmaps/fleet-pilot-gap-review.md` - current repo-to-plan gap review
- `docs/roadmaps/ai-assisted-command-centre-roadmap.md` - AI-assisted command-centre direction and implementation phases
- `docs/roadmaps/fleet-stage1-execution-tranche-01.md` - earlier Stage 1 tranche reference

Next execution sequence:
1. Pilot Rehearsal Cockpit
2. What’s New + release discipline
3. Platform Identity & Access Management v1
4. Merchant Menu Editing / Price Update
5. Driver Fleet Organisations
6. Lead capture/commercial conversion backend

## Design authority
- `docs/design/fleet-ux-authority-brief.md` - legacy filename for ShipWright UX posture and rules
- `docs/design-system.md` - ShipWright Design System v1 and migration guidance

## Current remaining gaps
- open, unattended real-world pilot traffic is not approved yet; demos and tester sessions remain controlled on staging
- tracking is status/progress based, not live-map movement or guaranteed ETA tracking
- payout and reconciliation surfaces are visibility-first, not full Stripe Connect settlement automation
- courier readiness is read-only; approval and compliance ownership remain human operational responsibilities
- fleet organisations are management groups for courier pools; they do not automate fleet billing, payout, dispatch priority, or courier suspension in v1
- pilot management and guardrails are soft, non-blocking context for business workspaces and admin-led review for platform admins; they warn before wrong-readiness workflows but do not disable operations in v1
- Resend-backed external email delivery is intentionally parked until a verified sender/domain is available
- design-system migration and legacy `globals.css` reduction remain incremental, not finished
