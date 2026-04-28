# ondemand-logistics-platform (Phase 0 Foundations)

Foundational monorepo for a logistics platform with strict guarantees:
- server-side RBAC
- Postgres RLS
- strict database constraints
- idempotent writes
- transactional outbox
- append-only audit/event logs
- structured logging with `request_id`
- no silent failures

## Monorepo layout

- `apps/api` - NestJS API foundations
- `apps/worker` - Outbox worker with `FOR UPDATE SKIP LOCKED`
- `apps/web` - Next.js shell
- `packages/db` - SQL migrations and DB tests
- `packages/contracts` - shared Zod contracts
- `packages/observability` - logger + request context helpers

## Quick start

```bash
pnpm install
pnpm migration:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Migrations

- `packages/db/migrations/0001_foundations_schema.sql`
- `packages/db/migrations/0002_rls_policies.sql`

## Runbook

See `docs/runbooks/setup.md` for staging setup (Supabase, Render, Vercel, Upstash) and env vars.

## Roadmaps

- `docs/roadmaps/fleet-roadmap.md` - primary Fleet delivery roadmap
- `docs/roadmaps/fleet-scope-cut-matrix.md` - explicit build, buy, manual, and defer decisions by stage
- `docs/roadmaps/fleet-pilot-readiness-checklist.md` - pilot gate for controlled launch readiness
- `docs/roadmaps/fleet-pilot-working-plan.md` - Stage 1 execution plan and weekly working reference
- `docs/roadmaps/fleet-pilot-gap-review.md` - repo-to-plan alignment review for Stage 1 execution control
- `docs/roadmaps/fleet-stage1-execution-tranche-01.md` - next build-ready Stage 1 tranche for merchant activation, menu, and customer ordering

## Design Authority

- `docs/design/fleet-ux-authority-brief.md` - Fleet UX posture, principles, redesign priorities, and rules for future UI work
- `docs/design-system.md` - ShipWright Design System v1 tokens, hierarchy classes, component rules, and UI QA checklist
