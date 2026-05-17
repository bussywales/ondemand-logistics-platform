# Demo Known Limitations Talk Track

Use this document to explain current limitations calmly and consistently during demos.

## Staging Environment
Say:
- This demo runs on staging, not production.
- Staging is validated before demos using release verification, paid-delivery proof, and browser smoke.
- Staging may cold-start, so a brief first-load delay is possible.

Avoid:
- implying open production traffic is already supported
- treating staging proof as a production SLA

## Stripe And Browser Payment Proof
Say:
- The browser smoke validates the public ordering and checkout surface.
- The paid-delivery proof harness validates the full payment authorization, delivery, capture, and fulfilment chain in Stripe test mode.
- For demo discipline, we reference the latest proof artifact when showing final captured payment state.

Avoid:
- claiming browser smoke submits a live customer card payment end-to-end
- implying real funds movement in staging

## Email And Resend
Say:
- External email delivery is intentionally parked until a verified sender/domain exists.
- Internal notification and outbox behavior can still be validated as part of the proof process.

Avoid:
- saying customer email delivery is proven unless a verified sender/domain has been configured and tested separately

## No Autonomous AI Actions
Say:
- Command Intelligence v1 is deterministic and rules-based.
- It surfaces briefing, recovery suggestions, delay detection, incident drafts, and closeout reports.
- Human approval is required for refunds, cancellations, driver assignment, customer messages, and incident closure.

Avoid:
- calling it self-driving dispatch
- suggesting AI silently resolves incidents
- suggesting AI sends messages or changes payments automatically

## Tracking Is Status-Based
Say:
- Customer tracking shows order, payment, delivery, driver assignment state when safe, progress stage, timeline, and support copy.
- It does not show live map movement or exact driver coordinates.
- This is intentional for Stage 1 trust and privacy.

Avoid:
- implying GPS-level live tracking
- inventing ETAs where the system does not have them

## Courier Compliance Is Read-Only
Say:
- Admin driver readiness shows profile, verification, vehicle, online state, location freshness, active job, checklist status, and recommended next action.
- Approval remains a human operational decision.

Avoid:
- describing readiness as a punitive score
- saying drivers are automatically approved, suspended, or penalized

## Payout Visibility Is Not Settlement Automation
Say:
- Payment risk and admin payment views expose operational risk and settlement-related visibility.
- Stage 1 does not automate Stripe Connect payouts or full reconciliation workflows.

Avoid:
- promising automated driver payouts
- presenting payment risk as a complete finance ledger

## Controlled Demo Readiness
Say:
- ShipWright is ready for controlled demos and tightly managed internal tester sessions on staging.
- The remaining work is about live operating ownership, broader pilot hardening, email sender verification, and production-grade settlement/compliance workflows.

Avoid:
- claiming open unattended real-world pilot readiness
