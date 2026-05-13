# Pilot Readiness Final Pass

## Status
ShipWright Stage 1 is **staging-proven and ready for controlled demos plus tightly managed internal testers**.

ShipWright Stage 1 is **not yet ready for an open real-world pilot without named operational ownership and manual fallback discipline**.

This pass reflects the latest verified staging evidence, current repo implementation, and the supporting runbooks and playbooks available in the repository as of 2026-05-02. It should also be read as the foundation document for the next AI-assisted command-centre phase, not as evidence that assistive AI is already shipping in production workflows.

## Latest evidence used
- release verification artifact:
  - `docs/proofs/release-verify-20260502T202910Z.json`
- paid-delivery proof artifact:
  - `docs/proofs/paid-delivery-20260502T203624Z.json`
- supporting docs:
  - `docs/roadmaps/fleet-pilot-readiness-checklist.md`
  - `docs/roadmaps/fleet-pilot-working-plan.md`
  - `docs/playbooks/README.md`
  - `docs/staging-paid-delivery-proof.md`
  - `docs/release-checklist.md`

## What is staging-proven
The following is backed by current staging verification or the live paid-delivery proof harness:

### Release and schema discipline
- `pnpm release:verify-staging` passes against staging
- `GET /healthz` returns `200`
- `GET /readyz` returns `200`
- direct schema sanity passes for release-critical tables:
  - `public.payments`
  - `public.jobs`
  - `public.outbox_messages`
  - `public.customer_orders`
  - `public.notification_reads`
  - `public.platform_admins`
- `customer_orders.status` supports `FULFILLED`
- proof artifacts are written to `docs/proofs/`

### End-to-end delivery loop
The latest paid-delivery proof confirms:
- public customer order submission succeeds
- Stripe payment is authorised
- order creates downstream job and payment rows
- dispatch offer is created
- staged driver receives and accepts the offer
- driver transitions through:
  - `EN_ROUTE_PICKUP`
  - `PICKED_UP`
  - `EN_ROUTE_DROP`
  - POD recorded
  - `DELIVERED`
- payment capture completes
- final customer order state reaches `FULFILLED`

Latest proven ids from the current artifact:
- order: `aeee8c5a-53c9-4543-a3bc-f25537975aa6`
- job: `8b8d9e69-8124-4749-b82e-9a067e5b83cf`
- payment: `b11aa1f8-506f-4a74-9ae2-227c48de0a17`
- offer: `41580b30-1a44-4995-bb44-aea0deb018fd`
- proof of delivery: `0202deb5-b6df-495d-9d29-1ddd6a94ef2e`

### Outbox and operational event flow
The latest proof artifact shows processed outbox coverage for:
- `JOB_DISPATCH_REQUESTED`
- `NOTIFY_BUSINESS_NEW_ORDER`
- `NOTIFY_CUSTOMER_ORDER_CONFIRMATION`
- `NOTIFY_DRIVER_OFFER`
- `NOTIFY_JOB_ASSIGNED`
- `NOTIFY_JOB_EN_ROUTE_PICKUP`
- `NOTIFY_JOB_PICKED_UP`
- `NOTIFY_JOB_EN_ROUTE_DROP`
- `NOTIFY_JOB_DELIVERED`
- `NOTIFY_PAYMENT_CAPTURED`
- `PAYMENT_CAPTURE_REQUESTED`
- `PAYMENT_INTENT_CREATE_REQUESTED`

### Operator and admin surfaces
Repo and staging evidence support:
- `/app/orders` exists as the order-first operator queue
- `/app/payments` exists as the payment-risk lens over orders
- `/app/reports/end-of-day` exists as the deterministic closeout report
- `/app/notifications` exists with persistent read state
- `/driver` exists as the driver execution surface
- `/admin` exists for `PLATFORM_ADMIN`
- `/admin/command` exists as the admin-native cross-org command-intelligence view
- `/admin/drivers` exists as the read-only courier readiness and compliance review surface
- help centre and product updates surfaces exist
- pilot playbooks now exist and are linked from help and admin
- the current command surfaces are strong enough to become the base layer for assistive AI overlays later

## What is browser-tested vs structurally checked
This pass separates direct live evidence from route/component structure.

### Browser-tested or live-request-backed in this pass
- `/restaurants/pilot-kitchen-1777370757`
  - live deployment reachable
  - public shell responds and loads the ordering route
- `/track/aeee8c5a-53c9-4543-a3bc-f25537975aa6`
  - live public tracking route exists in repo and latest order id is available from the current proof artifact
- `/admin`
  - live deployment responds with the authenticated control-plane loading shell
- `https://api-staging-qvmv.onrender.com/healthz`
  - verified by `release:verify-staging`
- `https://api-staging-qvmv.onrender.com/readyz`
  - verified by `release:verify-staging`
- full Stage 1 order-to-fulfilled loop
  - verified by `pnpm proof:staging-paid-delivery`

### Structurally checked in this pass
The following screens were checked through current route/component structure, successful builds/tests, and shell composition rather than a live authenticated browser session in this pass:
- `/app`
- `/app/orders`
- `/app/payments`
- `/app/notifications`
- `/app/restaurant`
- `/driver`
- `/admin`

Structural confidence is high because:
- route files resolve to the correct shell components
- the workspace shell was recently corrected for `/app/payments`
- `pnpm --filter @shipwright/web test` and `pnpm typecheck` are green
- the business/admin/driver surfaces are covered by existing component and state tests

### Still recommended as manual browser rechecks before pilot traffic
- public ordering flow after any customer-shell UI change
- business notifications visibility after auth or notifications changes
- public tracking page against the latest proof order after any tracking UI change
- authenticated `/app`, `/driver`, and `/admin` flows using seeded staging accounts before live pilot windows

## What remains manual
These are operationally manual by design or by current Stage 1 scope.

### Operations and support
- dispatch fallback handling
- support escalation handling
- customer communication for blocked orders
- restaurant communication when dispatch or payment risk blocks fulfilment
- cancellation and refund judgment on exception paths
- reconciliation follow-up beyond visibility

### Pilot staffing and ownership
- named incident owner during pilot windows
- named support/escalation owner during pilot windows
- named courier/compliance owner during pilot windows
- named restaurant contact and operating hours owner

### Tester handling
Controlled testers can proceed only if:
- the operating window is narrow
- a human operator is actively monitoring `/app/orders`, `/app/payments`, and `/admin`
- the fallback playbooks in `docs/playbooks/` are treated as the operating path, not optional reading

## Near-term AI direction
The recommended next strategic layer is assistive AI for command-centre workflows, not silent automation.

Recommended next tranche:
- daily operator briefing
- failed dispatch recovery suggestions
- delay detection
- AI-generated incident summaries
- end-of-day operations report
- pilot readiness command dashboard

Current state of this layer:
- daily briefing, dispatch recovery, delay detection, incident drafts, and end-of-day reporting are implemented as deterministic human-in-the-loop command surfaces
- no autonomous AI decisioning is required for the current staging-proof posture

Reference roadmap:
- `docs/roadmaps/ai-assisted-command-centre-roadmap.md`

## What is parked
The following is intentionally not treated as a current pilot proof requirement:
- Resend-backed outbound email delivery
  - parked until verified sender/domain exists
- full payout automation
- Stripe Connect / marketplace settlement complexity
- rich live-map or real-time courier movement
- full design-system migration of every shell
- full `globals.css` retirement
- autonomous AI decisions on refunds, cancellations, driver assignment, payments, customer messaging, or incident closure

## What blocks a real pilot
These are the real blockers to claiming broad live-pilot readiness.

### Operational blockers
- fallback playbooks exist, but real pilot execution still needs named owners and rehearsal discipline
- customer/operator tracking v1 is still not strong enough to remove manual support dependence
- payout and reconciliation remain visibility-first rather than operationally closed
- courier compliance is still thinner in live-ops ownership than in the staging fixture model

### Proof and UX blockers
- authenticated browser recheck of business new-order notification visibility should remain part of release rehearsal after auth/notification changes
- the public ordering route is real, but should still be re-walked manually before any live pilot window after UI changes

### Commercial / operating blockers
- pilot geography, service window, and operating constraints still need explicit owner sign-off
- restaurant commitments and operational responsibilities still need to be formalised outside the staging product proof

## What can proceed now with controlled testers
The following is reasonable now:
- investor demos
- guided internal demos
- tightly managed staging testers
- controlled restaurant walkthroughs
- proof-based rehearsal of the full operating loop

Conditions:
- use seeded staging fixtures
- use the documented proof and release commands
- keep support staff present
- treat playbooks as live operating instructions
- avoid claiming production-grade autonomy or unattended pilot readiness

Recommended supporting docs for these sessions:
- `docs/demo/controlled-demo-runbook.md`
- `docs/demo/demo-script.md`
- `docs/demo/tester-session-checklist.md`
- `docs/demo/known-limitations.md`

## Recommended next pilot actions
1. Rehearse one full browser-led demo using the latest proof order plus `/track/[orderId]`, `/app/orders`, `/app/payments`, `/driver`, and `/admin`.
2. Run `pnpm release:verify-staging` and `pnpm proof:staging-paid-delivery` immediately before any investor or pilot-facing session.
3. Assign named owners for:
   - incident command
   - customer support
   - restaurant escalation
   - courier escalation
   - payment/refund decisions
4. Rehearse the playbooks in `docs/playbooks/` against at least:
   - failed dispatch
   - no eligible driver
   - payment authorised but delivery blocked
   - driver no-show
5. Repeat authenticated browser verification of:
   - `/app/notifications`
   - `/app/orders`
   - `/driver`
   - `/admin`
   using the seeded staging accounts before any controlled tester window.
6. Keep outbound email as non-blocking until a verified Resend sender/domain exists, then run a separate proof for external delivery.

## Final readiness call
**Ready now:** controlled demos and tightly managed internal testers on staging.

**Not ready yet:** unattended or open real-world pilot operations.

The software spine is credible. The remaining gaps are primarily operational ownership, manual exception handling discipline, live tracking/support quality, and payout/reconciliation maturity rather than the absence of a basic end-to-end product loop.
