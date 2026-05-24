# ShipWright Operator Demo Pack

Audience: dispatch teams, local commerce platforms, multi-merchant operators, operations leaders, and support partners.
Recommended duration: 15 minutes.

## Demo objective
Show ShipWright as an operations control plane: release readiness, validation evidence, pilot posture, merchant workflow, dispatch governance, support escalation, finance review, fleet readiness, and enterprise governance.

Positioning:
- Operators need calm visibility and accountable intervention, not another dashboard grid.
- ShipWright connects proof, support, dispatch, finance, fleet, menu, and governance into one operational posture.
- The system guides and records human decisions; it does not silently automate high-risk actions.

## Pre-demo proof anchor
Before the session, confirm:
- `pnpm rehearsal:verify-staging` passed.
- `/admin/release-readiness` shows `READY`.
- Smoke passed `7/7`.
- Latest proof IDs are recorded: order, job, payment, POD.
- Staging is deployed from latest `main`.

## 15-minute flow
1. Minute 0-1: Public and commercial framing
   - Open `/` and `/pricing`.
   - Explain controlled pilot packaging and proof-backed operations.

2. Minute 1-2: Commercial intake
   - Open `/demo/request`.
   - Explain request persistence and admin follow-up; CRM sync is deferred.

3. Minute 2-3: Release readiness
   - Open `/admin/release-readiness`.
   - Show `READY` and explain the 24-hour stored-evidence posture.

4. Minute 3-4: Validation evidence
   - Open `/admin/validation-evidence`.
   - Show release verify, paid proof, and required-auth smoke records.

5. Minute 4-5: Admin command
   - Open `/admin/command`.
   - Show cross-org posture, support, finance, dispatch, notifications, demo requests, and pilots.

6. Minute 5-6: Merchant operations
   - Open `/app/restaurant`.
   - Show menu editing, visibility, reordering, history, rollback readiness, and rollback controls.

7. Minute 6-7: Public order flow
   - Open `/restaurants/pilot-kitchen-1777370757`.
   - Show customer-facing order path or reference latest paid proof IDs.

8. Minute 7-8: Job operations
   - Open `/app/jobs` and a job detail if available.
   - Show dispatch governance, support log, courier context, and human-reviewed recovery.

9. Minute 8-9: Support escalation audit
   - Show order/job support log history where a record exists.
   - Explain detect, log, act, resolve, closeout.

10. Minute 9-10: Finance review
   - Open `/app/finance`.
   - Show finance summary, refund candidates, and persistent finance review workflow.

11. Minute 10-11: Admin finance
   - Open `/admin/finance`.
   - Show cross-org finance visibility and no refund/payout mutation.

12. Minute 11-12: Dispatch governance audit
   - Open `/admin/dispatch-audit`.
   - Show assignment accountability and independent/fleet courier context.

13. Minute 12-13: Fleet readiness
   - Show fleet readiness from `/fleet` if a fleet-manager session is available, or reference `/admin/fleets` from platform admin.
   - Explain readiness is visibility, not scoring or automatic dispatch preference.

14. Minute 13-14: Enterprise governance
   - Open `/admin/governance`.
   - Show suspension posture and impersonation preview foundation.

15. Minute 14-15: Close
   - Summarize controlled-pilot readiness, proof, auditability, and human-reviewed limits.

## Key proof points to call out
- Release readiness: `READY`.
- Validation evidence: release verification, paid proof, required-auth smoke.
- Paid-delivery proof: fulfilled order and captured payment.
- Support escalation audit: append-only human follow-up history.
- Dispatch governance: assignment override audit and manual recovery records.
- Finance review: persistent ownership, status, closeout, no provider mutation.
- Menu rollback: preview, typed confirmation, audit-backed restoration.
- Fleet readiness: driver-company operators can review readiness without punitive scoring.

## Honest limitations
- No autonomous refunds.
- No payout automation.
- No CRM sync.
- No autonomous dispatch.
- No live impersonation.
- No SSO/SCIM.
- No automatic customer messaging from support or finance records.

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

## Operator close line
ShipWright is useful to operators because it makes readiness, exceptions, financial review, dispatch intervention, and proof visible in one accountable system without hiding risky actions behind automation.
