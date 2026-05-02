# Fleet Pilot MVP Gap Review

## Purpose
This review checks the current repo and staging proof state against the Stage 1 working plan.

Its purpose is to prevent stale assumptions, expose what is genuinely working now, and keep the remaining Stage 1 gaps honest.

## Evidence standard
This review uses a hard standard:
- code existence is not enough
- staging proof is stronger than local confidence
- actor-facing surfaces matter, not just backend capability
- internal console progress does not substitute for pilot operating readiness
- release hardening does not close product or operations gaps by itself

## Review basis
### Source documents reviewed
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-working-plan.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/staging-paid-delivery-proof.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/release-checklist.md`

### Repo areas inspected
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api`
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web`
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/worker`
- `/Users/olubusayoadewale/Coding Projects/shipwright/packages/contracts`
- `/Users/olubusayoadewale/Coding Projects/shipwright/packages/db/migrations`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/proofs`

## Current Stage 1 alignment summary
### Strongly aligned
- public restaurant ordering route is real
- staged Stripe-backed customer checkout is real
- paid orders create downstream customer order, job, payment, outbox, and audit state
- business operators can view orders in `/app/orders`
- driver execution route exists and completes the staged proof loop
- POD, delivered status, payment capture, and `FULFILLED` order state are proven
- admin control plane exists
- business notifications and persistent read state exist
- release verification and proof archive are real and current

### Partially aligned
- restaurant onboarding and menu setup are real for the pilot path, but still narrow and not broadly packaged
- branded customer ordering is real, but design-system migration and UX cleanup are still ongoing
- dispatch operations are real, but customer/operator tracking v1 and fallback playbooks remain incomplete
- courier execution is real in the proof harness, but live pilot compliance/ops ownership is still incomplete

### Still underdeveloped
- customer and operator tracking v1
- fallback dispatch/support/escalation playbooks
- payout and reconciliation visibility
- external email delivery via Resend with a verified sender/domain
- broader shell decomposition and legacy CSS cleanup

## Closed since earlier review
The following gaps from earlier roadmap language are now closed or materially reduced:
- no customer-facing ordering route
- no menu-backed public restaurant surface
- no real paid customer checkout path
- no business orders surface for customer orders
- no usable driver execution route
- no proven POD -> delivered -> captured -> fulfilled path
- no platform admin surface
- no persistent notification read state
- no release verification archive or schema-critical readiness gating

## Workstream-by-workstream status

### 1) Restaurant onboarding and menu setup
**Current reality**
- pilot restaurant/menu path exists
- menu-backed ordering route is real
- merchant setup surface exists under `/app/restaurant`

**Status**
- In progress

**Remaining gaps**
- broader merchant workflow polish
- less brittle menu editing and activation experience
- clearer pilot merchant operating ownership

### 2) Branded customer ordering flow
**Current reality**
- `/restaurants/[slug]` works
- browse, cart, checkout, and order submission are real
- success state and return-to-menu behavior are real

**Status**
- In progress

**Remaining gaps**
- customer-ordering design-system migration is only the first pass
- broader browser verification should be repeated after UI changes
- legacy customer CSS cleanup is still ongoing

### 3) Checkout and payment
**Current reality**
- Stripe test-mode authorization works
- delivered jobs capture payment
- customer order ends as `FULFILLED`

**Status**
- In progress

**Remaining gaps**
- payout/reconciliation visibility
- external email delivery proof with a verified sender/domain

### 4) Courier onboarding compliance
**Current reality**
- driver fixtures, vehicle rows, and approval state exist
- driver route exists
- driver execution flow is real in staging proof

**Status**
- In progress

**Remaining gaps**
- live pilot compliance ownership
- explicit non-fixture courier operating process

### 5) Courier offer, accept, and delivery flow
**Current reality**
- offer, accept, pickup, drop, POD, and delivered flow are proven in staging

**Status**
- In progress

**Remaining gaps**
- keep proof stable outside the scripted harness
- validate live-pilot operator handling around real driver variability

### 6) Dispatch and order-state operations
**Current reality**
- paid orders create jobs
- dispatch runs
- retry/reassign/cancel are hardened
- order/job/payment state is visible in business and admin surfaces

**Status**
- In progress

**Remaining gaps**
- customer/operator tracking v1
- fallback dispatch playbooks

### 7) Basic customer and restaurant visibility
**Current reality**
- business orders and notifications exist
- admin visibility exists
- customer route has success-state confirmation

**Status**
- In progress

**Remaining gaps**
- tracking v1
- stronger restaurant-facing visibility without requiring admin/operator views
- keep browser verification of new-order notification visibility current after UI changes

### 8) Pilot operations and manual fallback processes
**Current reality**
- release/runbook discipline is strong
- operational fallback playbooks are still thin

**Status**
- At risk

**Remaining gaps**
- manual dispatch fallback
- support and escalation path
- payout/reconciliation operating process

### 9) Release reliability and platform hardening
**Current reality**
- `/readyz` checks release-critical schema compatibility
- `pnpm release:verify-staging` exists
- proof artifacts are archived under `docs/proofs/`

**Status**
- In progress

**Remaining gaps**
- continue to keep release checks aligned with newly added migrations
- keep proof artifacts current enough to support demos and reviews

## Highest-priority remaining Stage 1 blockers
1. customer and operator tracking v1
2. fallback dispatch/support/escalation playbooks
3. payout and reconciliation visibility
4. live pilot compliance ownership beyond staged driver fixtures
5. verified external email sender/domain if email proof is needed
6. ongoing design-system migration and legacy CSS reduction

## Overstatement warnings to avoid
- staging proof is not the same as broad production readiness
- driver proof harness success is not the same as completed pilot compliance packaging
- admin visibility is not the same as full restaurant/customer visibility
- Stripe capture proof is not the same as finished payout/reconciliation tooling
- design-system migration progress does not mean the UI migration is complete
