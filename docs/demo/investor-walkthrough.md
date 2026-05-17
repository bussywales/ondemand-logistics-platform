# Investor Walkthrough

## Demo Objective
Show ShipWright as a premium logistics command centre for local commerce: public ordering, paid checkout, dispatch, courier execution, customer tracking, payment visibility, command intelligence, admin oversight, and proof-backed delivery closeout.

The objective is not to claim production-scale autonomy. The objective is to show a validated Stage 1 system with a credible path toward AI-assisted operations.

## Target Audience
Use this walkthrough for:
- investors evaluating product maturity and market direction
- advisors reviewing operational defensibility
- strategic partners evaluating pilot readiness
- internal leadership aligning on demo narrative

## First 60 Seconds
Say:

> ShipWright is an AI-assisted logistics command centre for local commerce. It connects the customer order, merchant readiness, dispatch, courier execution, payment state, tracking, proof of delivery, and operator recovery workflow in one system. The current staging product is built for controlled demos and tightly managed testers. It is not autonomous and it is not positioned as an open public pilot yet. The important point is that the operating spine is real: a paid order can move through dispatch, driver execution, proof of delivery, payment capture, fulfilment, and evidence-backed closeout.

Then anchor the proof:
- latest `release-verify-*.json` under `docs/proofs/`
- latest `paid-delivery-*.json` under `docs/proofs/`
- latest order id, job id, payment id, and POD id from the proof output

## Exact Demo Route Order
Use this route order unless staging health requires the fallback path:

1. `/`
2. `/restaurants/pilot-kitchen-1777370757`
3. checkout surface
4. `/track/[latestOrderId]`
5. `/app`
6. `/app/orders`
7. `/app/orders/[latestOrderId]`
8. `/app/jobs/[latestJobId]`
9. `/app/reports/end-of-day`
10. `/admin`
11. `/admin/command`
12. `/admin/drivers`
13. `/driver`

## Screen Talk Track

### `/`
Say:
- ShipWright is positioned as logistics command infrastructure, not a generic delivery dashboard.
- The public product narrative is local commerce in motion: ordering, dispatch, courier execution, payment state, tracking, and command intelligence.
- Command Intelligence is assistive and human-in-the-loop.

Show:
- premium landing page hero
- commerce movement story
- Command Intelligence positioning
- proof and trust sections

Avoid:
- claiming autonomous AI operations
- claiming broad production marketplace readiness

### `/restaurants/pilot-kitchen-1777370757`
Say:
- This is the public customer ordering surface for the pilot restaurant fixture.
- Menu, basket, delivery details, and checkout are connected to staging systems.

Show:
- branded menu
- cart flow
- delivery detail fields
- checkout surface entry

### Checkout surface
Say:
- The checkout surface is Stripe-backed in staging/test mode.
- For proof, the paid-delivery harness verifies the payment authorization and capture path end-to-end.

Show:
- payment section mounts
- order submission path if running live during the demo

Avoid:
- presenting browser card submission as the only proof if the session is using an existing proof artifact

### `/track/[latestOrderId]`
Say:
- Customer tracking is status/progress based.
- It intentionally does not claim live GPS movement or expose private driver details.

Show:
- headline state
- what-happens-next panel
- pickup to courier to drop-off visual
- readable timeline
- support/escalation copy

### `/app`
Say:
- This is the business command workspace.
- Daily briefing and Command Intelligence summarize current operational signals.
- Operators remain responsible for every recovery action.

Show:
- command summary
- daily briefing
- metrics
- active queue
- needs review queue
- links to report, payment risk, orders, and jobs

### `/app/orders`
Say:
- Orders are the primary operational control surface.
- Payment risk is shown as a lens on fulfilment, not as a detached finance dashboard.

Show:
- customer/order/payment/delivery/fulfilment/risk columns
- filters such as needs action, in delivery, payment risk, and fulfilled
- next action links

### `/app/orders/[latestOrderId]`
Say:
- Order detail explains fulfilment state, payment state, delivery/job state, customer tracking, and next action.
- The goal is to reduce operator ambiguity.

Show:
- top decision surface
- risk summary tiles
- payment context
- linked job context
- public tracking link
- readable timeline

### `/app/jobs/[latestJobId]`
Say:
- Job detail is the operational execution surface.
- Dispatch recovery suggestions and incident summaries are deterministic and advisory.

Show:
- delivery decision surface
- route and driver panel
- dispatch timeline
- payment panel
- operator controls
- human approval language

### `/app/reports/end-of-day`
Say:
- End-of-day report summarizes orders, deliveries, payment risks, incidents, and unresolved actions.
- It is not an automated closeout workflow; it is a deterministic operations report.

Show:
- headline
- operating summary
- payment summary
- incident/unresolved action stream
- links back to evidence

### `/admin`
Say:
- Platform admins get operational oversight without bypassing business/operator accountability.

Show:
- admin overview
- intervention queue
- payments/operations health
- command intelligence and driver readiness entry points

### `/admin/command`
Say:
- Admin Command Intelligence gives cross-org visibility into operational risk.
- It is read-only oversight and does not silently execute recovery actions.

Show:
- cross-org command summary
- grouped attention queue
- incidents
- end-of-day preview
- human approval note

### `/admin/drivers`
Say:
- Courier readiness is visible as compliance/readiness signals.
- It is not a punitive score and does not auto-approve drivers.

Show:
- ready / needs review / not eligible counts
- checklist breakdown
- verification, vehicle, online, location, and active job indicators
- recommended next action

### `/driver`
Say:
- Driver flow proves staged courier execution: availability, offers, acceptance, progression, and POD.
- This is still a controlled staging route, not a full live courier app.

Show:
- driver state
- offer/assignment state if present
- execution flow where available
- blocked state guidance if not ready

## What To Avoid Overclaiming
Do not claim:
- open public pilot readiness
- production-scale marketplace readiness
- autonomous AI recovery or autonomous dispatch decisioning
- automatic refunds, cancellations, driver assignment, incident closure, or customer messages
- live GPS tracking or accurate ETAs
- Stripe Connect payout automation
- Resend external email delivery until verified sender/domain exists
- courier compliance completeness beyond the current readiness surface

## Proof Artifact References
Before the demo, record:
- latest release verification file: `docs/proofs/release-verify-<timestamp>.json`
- latest paid-delivery proof file: `docs/proofs/paid-delivery-<timestamp>.json`
- latest order id
- latest job id
- latest payment id
- latest POD id, if present

Expected proof chain:
- job status: `DELIVERED`
- order status: `FULFILLED`
- payment status: `CAPTURED`
- notification outbox processed for the staged flow
- readiness checks green

## Known Limitations
Reference `docs/demo/demo-known-limitations-talk-track.md` during Q&A.

Core limitations:
- staging only
- proof harness validates paid delivery, while browser smoke does not submit a live card payment
- tracking is status/progress based, not a live map
- Command Intelligence is deterministic/rules-based today
- courier readiness is read-only
- payout visibility is not settlement automation
- Resend external email remains parked pending verified sender/domain

## Fallback If Staging Is Cold Or Slow
If staging cold-starts or a live step fails:
- acknowledge it directly
- switch to the latest proof-backed order and tracking route
- continue from `/track/[latestOrderId]`, `/app/orders/[latestOrderId]`, and `/app/jobs/[latestJobId]`
- record the failure after the session with route, timestamp, screenshot, and request id if available
