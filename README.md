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
- Help centre: `/help`
- Product updates: `/app/updates`, `/driver/updates`, `/admin/updates`

## Key commands
```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test
pnpm --filter api test
pnpm typecheck
```

## Migrations
The schema has moved well beyond the original foundations migrations.

See the full migration history in:
- `packages/db/migrations`

Current release-critical migrations include restaurant/menu, customer orders, fulfilled order state, notification read state, and platform admin support.

## Strategic direction
- current state: operational delivery and dispatch foundations
- near-term direction: operator-first AI assistance for briefing, triage, recovery, and summaries
- later direction: recommendation systems with human approval
- deferred: high-risk automation without operator review

## Current Stage 1 evidence
- Proof archive: `docs/proofs/`
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
- `docs/demo/tester-session-checklist.md` - before/during/after checklist for internal tester sessions
- `docs/demo/known-limitations.md` - claims boundary and current limitations

## Roadmaps
- `docs/roadmaps/fleet-roadmap.md` - legacy roadmap filename for the core ShipWright delivery plan
- `docs/roadmaps/fleet-scope-cut-matrix.md` - build, buy, manual, and defer decisions by stage
- `docs/roadmaps/fleet-pilot-working-plan.md` - Stage 1 execution status and priorities
- `docs/roadmaps/fleet-pilot-readiness-checklist.md` - pilot gate split into staging-proof and live-pilot readiness
- `docs/roadmaps/fleet-pilot-gap-review.md` - current repo-to-plan gap review
- `docs/roadmaps/ai-assisted-command-centre-roadmap.md` - AI-assisted command-centre direction and implementation phases
- `docs/roadmaps/fleet-stage1-execution-tranche-01.md` - earlier Stage 1 tranche reference

## Design authority
- `docs/design/fleet-ux-authority-brief.md` - legacy filename for ShipWright UX posture and rules
- `docs/design-system.md` - ShipWright Design System v1 and migration guidance

## Current remaining gaps
- customer and operator tracking v1 remains incomplete
- pilot fallback, escalation, and reconciliation playbooks remain incomplete
- payout and reconciliation visibility remain incomplete
- Resend-backed external email delivery is intentionally parked until a verified sender/domain is available
- design-system migration is ongoing; customer ordering migrated first, larger shell decomposition still remains
- legacy `globals.css` reduction is incremental, not finished
