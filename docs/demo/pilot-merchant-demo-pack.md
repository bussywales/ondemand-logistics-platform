# ShipWright Pilot Merchant Demo Pack

Audience: restaurant owners, local retailers, merchant operators, and pilot coordinators.
Recommended duration: 10 minutes.

## Demo objective
Show how a merchant can manage a controlled menu/order pilot, see order and delivery state, understand finance review needs, and recover exceptions with clear human-reviewed controls.

Positioning:
- ShipWright helps merchants operate local delivery with visibility and accountability.
- Merchant workflows are practical: menu setup, public ordering, order/job tracking, support escalation, and finance review.
- This is controlled pilot tooling, not open self-serve onboarding or autonomous refunds.

## Pre-demo proof anchor
Before the session, confirm:
- `pnpm rehearsal:verify-staging` passed.
- `/admin/release-readiness` is `READY`.
- Smoke passed `7/7`.
- Latest proof IDs are recorded: order, job, payment, POD.
- Staging is deployed from latest `main`.

## 10-minute flow
1. Minute 0-1: Public context at `/`
   - Explain the platform as controlled local commerce operations.
   - Keep the message practical, not investor-heavy.

2. Minute 1-2: Pilot package at `/pricing`
   - Show the Controlled Pilot package.
   - Explain pricing is discussed after fit review because pilot scope, order volume, and support needs vary.

3. Minute 2-3: Merchant setup at `/app/restaurant`
   - Show merchant profile and menu management.
   - Show item price editing, availability, section/item ordering, and menu history.

4. Minute 3-4: Menu rollback proof at `/app/restaurant`
   - Show rollback readiness labels.
   - Explain rollback requires preview, typed confirmation, and audit trail.

5. Minute 4-5: Public restaurant ordering route
   - Open `/restaurants/pilot-kitchen-1777370757`.
   - Show customer-facing menu, basket, checkout surface, and safe staging data.

6. Minute 5-6: Order/job operations at `/app/jobs`
   - Show job state and dispatch governance context.
   - Explain assignment changes are human-reviewed and audited.

7. Minute 6-7: Finance visibility at `/app/finance`
   - Show captured/pending/failed posture and persistent finance reviews.
   - Explain no automated refund or provider mutation happens.

8. Minute 7-8: Admin finance and proof if needed at `/admin/finance`
   - Show platform support can see finance posture without issuing refunds.

9. Minute 8-9: Release readiness proof at `/admin/release-readiness` and `/admin/validation-evidence`
   - Show the demo is evidence-backed.

10. Minute 9-10: Close
   - Ask what menu, support, and finance review workflows need to be prepared for their pilot.

## Key proof points to call out
- Release readiness: `READY`.
- Validation evidence: release verify, paid proof, required-auth smoke.
- Paid-delivery proof: captured payment and fulfilled order.
- Support escalation audit: human follow-up and closeout history.
- Dispatch governance: manual assignment decisions are recorded.
- Finance review: refund review is tracked without automatic refunds.
- Menu rollback: reversible menu changes can be previewed and restored with audit.
- Fleet readiness: fleet-managed courier context is visible where relevant.

## Honest limitations
- No autonomous refunds.
- No payout automation.
- No CRM sync.
- No autonomous dispatch.
- No live impersonation.
- Merchant onboarding is controlled, not broad self-serve.
- Tracking is status-based, not live GPS map movement.

## Exact route walkthrough
- `/`
- `/pricing`
- `/demo/request`
- `/admin/release-readiness`
- `/admin/validation-evidence`
- `/admin/command`
- `/app/restaurant`
- `/restaurants/pilot-kitchen-1777370757`
- `/app/jobs`
- `/app/finance`
- `/admin/finance`
- `/admin/dispatch-audit`
- `/admin/governance`

## Merchant close line
ShipWright gives merchants a controlled way to manage menu, orders, delivery visibility, finance review, and support follow-up while keeping risky decisions in human hands.
