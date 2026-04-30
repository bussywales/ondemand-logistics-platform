# Investor Demo Script

## Purpose
Use this script to present ShipWright's proven Stage 1 loop as a coherent operating product, not a disconnected UI tour.

## Demo objective
Show one connected story:
1. a merchant can be activated
2. a customer can place and pay for a real order
3. operations can manage dispatch and intervention
4. a driver can complete delivery with POD
5. payment capture and order fulfilment close the loop
6. notifications and admin oversight support pilot operations

## Preconditions
- Staging auth fixtures are seeded with `pnpm fixtures:staging-auth`.
- A `PLATFORM_ADMIN` user has been seeded in `public.platform_admins`.
- The pilot restaurant `pilot-kitchen-1777370757` exists with an active menu.
- The latest paid-delivery proof has been run with `pnpm proof:staging-paid-delivery`.
- If you intend to show external email delivery, confirm provider env separately before the demo.

## Talk track
### 1. Merchant setup
Screen: `/app/restaurant`
- Explain that ShipWright starts with a real merchant foundation, not mock catalogue data.
- Show the merchant setup progression: restaurant identity, menu section, item, preview.
- Outcome: the merchant is activation-ready for a controlled pilot.

### 2. Public ordering
Screen: `/restaurants/pilot-kitchen-1777370757`
- Show the branded restaurant route with a real active menu.
- Explain that the customer path is public and connected to the same operational system.
- Outcome: browse, cart, and checkout are part of the pilot spine.

### 3. Orders and payments
Screen: `/app/orders`
- Explain that a paid checkout creates a customer order, linked payment, and linked delivery job.
- Show fulfilment, payment, and delivery statuses together.
- Outcome: customer order -> payment -> delivery is visible as one operational record.

### 4. Operations and Needs Review
Screen: `/app`
- Show Needs Review as the operator control centre.
- Explain that dispatch failures, delays, and payment blockers are surfaced as decision work, not hidden in logs.
- Outcome: operator attention is guided by diagnosis and next action.

### 5. Jobs decision surface
Screen: `/app/jobs` then `/app/jobs/[jobId]`
- Open a blocked or active job.
- Explain the decision banner, payment state, dispatch attempts, and route/driver context.
- Outcome: job detail is the decision surface for intervention.

### 6. Driver execution
Screen: `/driver`
- Show online/offline, offers, and step progression.
- Explain that the driver path is intentionally narrow and execution-focused.
- Outcome: a staged driver can accept, progress, submit POD, and deliver.

### 7. Completion and fulfilment
Screen: `/app/orders/[orderId]`
- Show the order after delivery and capture.
- Call out the final states: `DELIVERED`, `CAPTURED`, `FULFILLED`.
- Outcome: the commercial and operational loop closes cleanly.

### 8. Notifications and admin oversight
Screen: `/app/notifications`, then `/admin`
- Show operator notifications first.
- Show the admin control plane for cross-org intervention queue, active operations, recent orders, and health posture.
- Outcome: the system has oversight and pilot support depth beyond the happy path.

## Expected outcomes
- Merchant can be made orderable.
- Public route can take a real paid order.
- Orders and jobs remain linked end to end.
- Driver execution can complete with POD.
- Payment can be captured after delivery.
- Customer order reaches `FULFILLED`.
- Operators and platform admins can see intervention and system signals.

## Fallback plan
### If Stripe is unavailable
- Do not fake checkout.
- Use the latest documented proof summary and explain that the live payment rail is environment-gated.
- Continue with orders/jobs/driver/admin surfaces using the previously proven order.

### If external email is unavailable
- Show in-app notifications and outbox/admin oversight instead.
- State clearly whether email provider env is missing or not proven.

### If staging auth is unstable
- Use the public restaurant route first.
- Then sign in with seeded operator or driver fixtures instead of creating new accounts live.

### If dispatch cannot find a driver
- Explain the driver eligibility model.
- Use the driver assignment picker and/or show the existing proven paid-delivery summary rather than improvising a broken loop.

## Reset guidance
Use these before a demo window:
1. Refresh staging auth fixtures:
   - `pnpm fixtures:staging-auth`
2. Rerun the paid-delivery proof if you need a fresh reference order:
   - `pnpm proof:staging-paid-delivery`
3. If stale jobs or offers are cluttering the story, create a fresh proof order instead of mutating old records live.
4. Do not delete or rewrite staging evidence casually during a demo rehearsal. Prefer additive fresh records.

## What not to claim
- Do not claim real-time proof unless you have just rerun it.
- Do not claim production-hard notifications if provider env is absent.
- Do not imply scale-stage automation that is not yet implemented.
