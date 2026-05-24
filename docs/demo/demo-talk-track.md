# ShipWright Demo Talk Track

Use this document to keep demo language consistent across investor, merchant, and operator sessions.

## Opening statement
ShipWright is a controlled-pilot-ready logistics command centre for local commerce. It connects public ordering, merchant operations, dispatch and courier workflow, support escalation, finance review, release readiness, and audit evidence. The current product is evidence-backed and human-reviewed. It is not an autonomous dispatch or finance platform.

## Core narrative
1. Commerce enters the network through the public site, pricing page, demo request path, and restaurant ordering route.
2. Operators coordinate movement through merchant setup, jobs, dispatch governance, and fleet readiness.
3. Exceptions are reviewed through support escalation, finance review, and admin command posture.
4. Proof closes the loop through paid-delivery proof, validation evidence, release readiness, and audit histories.

## Proof points
- Release readiness `READY`: `/admin/release-readiness` gives the current readiness verdict from stored evidence.
- Validation evidence: `/admin/validation-evidence` stores release verification, paid-delivery proof, and required-auth smoke evidence.
- Paid-delivery proof: the proof run validates order, job, payment, POD, captured payment, and fulfilled order state.
- Support escalation audit: support records have owner/status/resolution and append-only event history.
- Dispatch governance: manual assignment/recovery decisions are recorded and visible in `/admin/dispatch-audit`.
- Finance review: `/app/finance` and `/admin/finance` expose review posture without refund or payout automation.
- Menu rollback: `/app/restaurant` supports rollback preview, typed confirmation, and audit-backed restoration.
- Fleet readiness: fleet managers can inspect readiness without punitive scoring or dispatch preference automation.

## Route talk track
- `/`: product story, controlled operations, proof-backed platform maturity.
- `/pricing`: controlled pilot packages, no fake public pricing.
- `/demo/request`: persisted commercial request path.
- `/admin/release-readiness`: release verdict, read-only, evidence-backed.
- `/admin/validation-evidence`: latest stored validation records.
- `/admin/command`: cross-org operational posture.
- `/app/restaurant`: merchant setup, menu operations, history, rollback.
- `/restaurants/pilot-kitchen-1777370757`: public ordering route.
- `/app/jobs`: job state, dispatch governance, support context.
- `/app/finance`: business finance review workflow.
- `/admin/finance`: cross-org finance visibility.
- `/admin/dispatch-audit`: read-only assignment accountability.
- `/admin/governance`: suspension and impersonation preview foundation.

## Honest limitation language
Use these exact boundaries:
- ShipWright does not automate refunds.
- ShipWright does not automate payouts or settlement.
- ShipWright does not sync to a CRM yet.
- ShipWright does not make autonomous dispatch decisions.
- ShipWright does not enable live impersonation yet.
- ShipWright does not include SSO/SCIM yet.
- Notification delivery requires configured webhook/email provider env.
- Tracking is status-based, not live GPS movement.

## Phrases to use
- controlled pilot
- human-reviewed
- evidence-backed
- audit-visible
- release-ready when evidence is fresh
- deterministic command posture
- no hard deletes
- no provider mutation

## Phrases to avoid
- fully autonomous
- self-driving dispatch
- automatic refunds
- automatic payouts
- production-scale marketplace
- guaranteed delivery
- live GPS tracking
- AI decides

## If something fails live
Say:
- This is staging. We do not hide failed checks.
- I will switch to the latest proof-backed state and identify whether this is environment, data, or product behavior.
- The readiness standard is `pnpm rehearsal:verify-staging`, stored validation evidence, and a `READY` release-readiness verdict.

## Proof asset narration
When showing captured product assets, describe them as staging-safe proof visuals.

Recommended sequence:
1. `release-readiness-ready.png` - "This is the current readiness verdict from stored evidence."
2. `validation-evidence.png` - "These records show release verification, paid proof, and smoke coverage."
3. `admin-command.png` - "This is the cross-org command posture operators use to see reviewable work."
4. `merchant-menu-operations.png` - "Merchant menu operations are audit-visible and rollback-prepared where metadata is complete."
5. `finance-review.png` - "Finance review is persistent and human-owned; no refund or payout is executed here."
6. `dispatch-audit.png` - "Manual dispatch intervention is recorded with actor, reason, and context."
7. `fleet-workspace.png` - "Fleet readiness is visibility, not scoring or automatic dispatch preference."
8. `governance-controls.png` - "Enterprise controls are reversible and audited; impersonation is preview-only."
9. `analytics-dashboard.png` - "Analytics are first-party funnel signals, not an external tracking vendor claim."
10. `demo-request-pipeline.png` - "Commercial requests are persisted and managed, not synced to CRM yet."

## Proof asset boundaries
- Say "staging-safe product capture" instead of "customer screenshot" unless the customer explicitly approves use.
- Say "evidence-backed readiness" instead of "guaranteed readiness".
- Say "human-reviewed workflow" instead of "automation" for finance, dispatch, support, governance, and rollback.
- Do not show unredacted personal data, secrets, internal tokens, or fake metrics.
