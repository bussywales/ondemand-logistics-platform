# Pilot Merchant Walkthrough

## Objective
Show a pilot merchant how ShipWright supports restaurant setup, menu readiness, paid ordering, delivery tracking, payment visibility, and support escalation during a controlled staging pilot.

This walkthrough should feel operational and practical. It should not sell autonomous delivery or unattended production readiness.

## Audience
Use this walkthrough for:
- restaurant owners or managers
- merchant operations leads
- internal onboarding reviewers
- pilot support coordinators

## Before The Session
Confirm:
- `pnpm release:verify-staging` has passed
- `pnpm proof:staging-paid-delivery` has passed
- latest order/job/payment/POD ids are recorded
- business smoke account works
- public restaurant route opens
- known limitations are ready to explain

## Walkthrough Flow

### 1. Restaurant setup
Open:
- `/app/restaurant`

Say:
- This is where merchant identity and restaurant readiness are managed for the staging pilot.
- The pilot fixture already has a restaurant and menu so the demo can focus on ordering and fulfilment.

Show:
- restaurant profile/readiness information available in the workspace
- any visible menu or setup status
- where operators would verify merchant readiness before service

Current boundary:
- Setup is sufficient for staged demos and controlled testers.
- Merchant onboarding polish and broader self-serve onboarding are still later work.

### 2. Public menu setup and customer ordering
Open:
- `/restaurants/pilot-kitchen-1777370757`

Say:
- Customers order from a branded public restaurant route.
- The menu and basket are connected to staging data.

Show:
- menu item selection
- cart
- delivery detail capture
- checkout surface

### 3. Accepting and reviewing orders
Open:
- `/app/orders`

Say:
- Orders become operational work, not just records.
- Operators can see fulfilment, payment, delivery, risk, customer total, and next action.

Show:
- latest order row
- payment status
- delivery/job state
- fulfilment state
- risk/next action

### 4. Order detail
Open:
- `/app/orders/[latestOrderId]`

Say:
- Order detail is the merchant/operator control surface for a specific order.
- It explains what is happening, what is blocked, and where to go next.

Show:
- decision surface
- fulfilment/payment/delivery/customer tracking tiles
- linked job
- public tracking link
- timeline

### 5. Tracking delivery state
Open:
- `/track/[latestOrderId]`

Say:
- Customers get a status-based tracking page.
- It shows progress and next-step guidance without exposing private driver details.

Show:
- order status
- delivery job status
- payment state
- delivery progress visual
- timeline
- support copy

Current boundary:
- This is not a live map.
- No fake courier movement or fake ETA is shown.

### 6. Payment visibility
Open:
- `/app/payments`

Say:
- Payment risk is an operational lens over orders.
- Merchants/operators can see when payment state affects fulfilment.

Show:
- no-risk empty state or risk-bearing order rows
- payment status on orders
- link back to order detail

Current boundary:
- This is not full settlement automation.
- Stripe Connect/payout automation is not part of Stage 1.

### 7. Support and escalation flow
Open:
- `/help/pilot-operations`
- docs playbooks if repo docs are available

Say:
- Recovery paths are documented so pilot support is not dependent on memory.
- Operators use playbooks for failed dispatch, no eligible driver, payment-authorized delivery blocked, driver no-show, cancellation/refund review, manual reassignment, and support escalation.

Show:
- relevant help topic
- playbook index if available
- escalation owner/evidence guidance

### 8. What is automated vs human-reviewed
Explain:

Automated or system-driven today:
- order creation
- payment authorization/capture proof path
- job lifecycle state handling
- driver offer/execution flow in staging
- public tracking state rendering
- deterministic briefing/reporting suggestions

Human-reviewed today:
- dispatch recovery decisions
- manual driver assignment decisions
- refunds and cancellations
- customer communication
- courier approval/compliance decisions
- incident closure
- payout/reconciliation review

## Merchant-Safe Closing
Close with:
- ShipWright is ready for controlled demos and tightly managed staging tester sessions.
- It is not yet an open unattended production pilot.
- The current value is operational visibility, payment-state clarity, delivery execution proof, and recovery discipline.
