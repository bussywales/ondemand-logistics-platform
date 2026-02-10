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
