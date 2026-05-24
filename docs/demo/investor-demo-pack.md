# ShipWright Investor Demo Pack

Audience: investors, strategic partners, advisors, and internal leadership.
Recommended duration: 10 minutes.

## Demo objective
Show that ShipWright is no longer only a polished landing page or prototype. It is a controlled-pilot-ready operations platform with proof-backed ordering, delivery, finance, support, dispatch governance, fleet readiness, validation evidence, and enterprise controls.

Positioning:
- ShipWright coordinates local commerce operations from order intake to proof-backed closeout.
- The current release is ready for controlled demos and managed pilot conversations.
- High-risk decisions remain human-reviewed; ShipWright does not claim autonomous logistics or finance execution.

## Pre-demo proof anchor
Before the call, confirm:
- `pnpm rehearsal:verify-staging` passed.
- `/admin/release-readiness` shows `READY`.
- Required-auth smoke passed `7/7`.
- `/admin/validation-evidence` shows fresh release verification, paid-delivery proof, and required-auth smoke evidence.
- Latest proof IDs are recorded: order, job, payment, POD.
- Staging web is deployed from latest `main`.

## 10-minute flow
1. Minute 0-1: Public story at `/`
   - Say ShipWright is controlled-pilot infrastructure for local commerce operations.
   - Show narrative around commerce entering the network, operations coordinating movement, exceptions reviewed, proof closing the loop.

2. Minute 1-2: Commercial packaging at `/pricing`
   - Show controlled pilot packages for merchants, operators, and investor/partner walkthroughs.
   - Emphasize no fake public pricing; pilot scope is discussed after fit review.

3. Minute 2-3: Demo request path at `/demo/request`
   - Show real persisted commercial intake.
   - Mention admin review and follow-up exist, but CRM sync is not active.

4. Minute 3-4: Release readiness at `/admin/release-readiness`
   - Show `READY` verdict.
   - Explain it reads stored evidence only and does not execute commands from the UI.

5. Minute 4-5: Validation evidence at `/admin/validation-evidence`
   - Show release verification, paid-delivery proof, and smoke evidence.
   - Anchor the platform in proof rather than claims.

6. Minute 5-6: Admin command at `/admin/command`
   - Show cross-org posture for support, finance, dispatch, pilots, notifications, and demo requests.
   - Explain Command Intelligence is deterministic and human-in-the-loop.

7. Minute 6-7: Product depth snapshot
   - `/app/restaurant`: menu operations, price/visibility changes, history, rollback.
   - public restaurant ordering route: customer ordering surface and checkout path.

8. Minute 7-8: Operations maturity snapshot
   - `/app/jobs`: dispatch governance and support context.
   - `/app/finance` and `/admin/finance`: finance visibility and persistent finance reviews.

9. Minute 8-9: Governance and audit snapshot
   - `/admin/dispatch-audit`: assignment accountability.
   - `/admin/governance`: organisation/user suspension and impersonation preview foundation.

10. Minute 9-10: Close
   - Summarize the proof points and limitations.
   - Ask whether the next conversation should be merchant pilot, operator partnership, or technical diligence.

## Key proof points to call out
- Release readiness: `READY`.
- Validation evidence: stored release verification, paid proof, and required-auth smoke.
- Paid-delivery proof: order, job, payment, POD, captured payment, fulfilled order.
- Support escalation audit: status, ownership, closeout, append-only history.
- Dispatch governance: manual override recording and admin audit.
- Finance review: persistent review workflow, ownership, resolution notes, no provider mutation.
- Menu rollback: preview, typed confirmation, audit-backed rollback.
- Fleet readiness: driver-company workspace, driver detail, readiness visibility.

## Honest limitations
- No autonomous refunds.
- No payout automation.
- No CRM sync.
- No autonomous dispatch.
- No live impersonation.
- No SSO/SCIM.
- Notification delivery requires configured webhook/email provider env.
- Public site has no fabricated customer logos or production metrics.

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

## Close line
ShipWright is controlled-pilot-ready because it can show proof, govern exceptions, expose readiness, and record human decisions without pretending risky automation is already solved.
