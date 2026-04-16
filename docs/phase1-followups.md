# Phase 2 Follow-ups

1. Replace placeholder reliability ranking with operational scoring and availability freshness weighting.
2. Add explicit driver reject endpoint and manual redispatch / cancellation controls.
3. Introduce dead-letter tooling and replay admin flows for dispatch/outbox failures.
4. Add customer and business read APIs for quote lookup, job tracking, and assignment visibility.
5. Add pricing configuration storage instead of hard-coded rate cards.
6. Add Redis-backed timing/coalescing if sequential offer volume makes Postgres-only timers insufficient.
7. Add payment, ledger, and payout reconciliation flows once job lifecycle expands beyond assignment.
