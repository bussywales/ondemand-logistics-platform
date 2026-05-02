# Fleet Pilot Readiness Checklist

This checklist defines the minimum credible gate for a controlled ShipWright pilot. It separates what is staging-proven today from what is still required for live pilot confidence.

## 1) Staging-proven baseline
These are already evidenced in the current repo and staging proof flow.

### Product and flow
- [x] at least one pilot restaurant route exists and serves a live active menu
- [x] branded ordering page is live for the pilot restaurant
- [x] customer checkout completes against Stripe test mode
- [x] payment is authorized for a paid customer order
- [x] order creation routes into the real downstream job and payment path
- [x] business operators can see customer orders in `/app/orders`
- [x] a staged driver can receive, accept, and execute a delivery
- [x] proof of delivery can be recorded
- [x] delivered job state is proven
- [x] payment capture after delivery is proven
- [x] customer order terminal state reaches `FULFILLED`
- [x] admin control plane is available to `PLATFORM_ADMIN`
- [x] business notifications exist with persistent read state
- [x] release verification and proof archive exist

### Technical readiness
- [x] staging verification sequence is documented and repeatable
- [x] `/healthz` passes
- [x] `/readyz` passes
- [x] readiness checks cover critical schema compatibility, including:
  - `public.notification_reads`
  - `public.platform_admins`
  - `customer_orders.status` supports `FULFILLED`
- [x] proof artifacts are written under `docs/proofs/`
- [x] direct schema sanity can run when `DATABASE_URL` is present
- [x] authenticated smoke checks can run when bearer tokens are present

## 2) Still required before controlled live pilot use
These are not closed just because staging proof is green.

### Operations and support
- [ ] fallback manual dispatch procedure exists and is owned
- [ ] support escalation path exists for failed, delayed, or disputed orders
- [ ] payout and reconciliation visibility is clear enough for pilot ops
- [ ] there is a named owner for incident, support, and escalation decisions during pilot

### Visibility and actor experience
- [ ] customer/operator tracking v1 is sufficient for pilot support needs
- [ ] restaurant staff can see live order state clearly enough to operate without internal admin help
- [ ] business new-order notification remains visibly verified in the live browser flow after notification UI changes

### Compliance and pilot operations
- [ ] minimum courier onboarding and identity checks are defined and applied operationally, not just via staging fixtures
- [ ] terms, liability, and operating responsibilities are clear enough for pilot use
- [ ] pilot geography and service window are explicitly constrained
- [ ] at least one restaurant has agreed to pilot on the defined operating terms

## 3) Payment and external notification caveats
- [x] Stripe authorization and capture are staging-proven
- [ ] payout and reconciliation visibility is still incomplete
- [ ] Resend-backed external delivery email is intentionally parked until a verified sender/domain exists
- [ ] external notification delivery should not be treated as proven until provider env and sender verification are complete

## 4) Browser and release gates
Before wider demos or pilot traffic:
- [x] `pnpm release:verify-staging` passes
- [x] `pnpm proof:staging-paid-delivery` passes
- [ ] repeat browser checkout proof after customer ordering UI changes
- [ ] repeat notification visibility proof after notifications UI changes

## 5) Not required for pilot
The following are useful, but not pilot gates:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- polished self-serve admin beyond operational need
- full payout automation
- full dispute automation
- rich courier earnings tooling
- complete design-system migration of every shell

## 6) Pilot success criteria
Use these measures to judge whether the pilot is working, not just whether the software shipped.

- [ ] first successful live order completed outside the proof harness
- [ ] successful completion rate is at least 90% across the first 25 pilot orders
- [ ] median dispatch acceptance time is 5 minutes or less during the controlled pilot window
- [ ] failed order rate remains below 10% across the first 25 pilot orders
- [ ] at least one pilot restaurant is willing to continue after the initial test period
- [ ] the operation can run for a sustained pilot window without constant manual intervention on every order
