# Pilot Readiness Summary

ShipWright is ready for controlled demos, managed rehearsals, and carefully supervised pilot conversations. It should be presented as a human-reviewed operational control plane, not an autonomous delivery marketplace.

## What Is Ready

- Public product story, pricing/pilot packages, and demo request capture.
- Persisted demo requests with admin follow-up workflow and notification diagnostics.
- First-party analytics for public funnel and CTA signals.
- Pilot workspaces, guardrails, rehearsal cockpit, and readiness checklist posture.
- Stored validation evidence and `/admin/release-readiness` verdict.
- One-command rehearsal verification: `pnpm rehearsal:verify-staging`.
- Merchant restaurant/menu operations, visibility controls, audit history, and rollback flow.
- Public restaurant ordering, customer tracking, jobs, driver flow, proof of delivery, and paid-delivery proof.
- Support escalation lifecycle with closeout metadata and append-only event history.
- Dispatch governance and assignment audit.
- Finance visibility and persistent finance review workflow.
- Fleet workspace with driver detail, team invites, and readiness visibility.
- IAM invite lifecycle, access audit, organisation/user suspension, and impersonation preview foundation.
- Operational reset tools for non-destructive staging/demo tidy-up.
- Reviewed public proof screenshots in `apps/web/public/proof/`.

## What Is Human-Reviewed

- Support escalation follow-up and closeout.
- Dispatch override and assignment recovery.
- Finance/refund review decisions.
- Menu rollback confirmation.
- Operational reset execution.
- Pilot readiness and go/no-go decisions.
- Organisation/user suspension and reactivation.
- Demo request qualification and commercial follow-up.

## What Is Not Automated

- No autonomous refunds.
- No payout automation.
- No CRM sync.
- No autonomous dispatch decisions.
- No automated customer messaging by AI.
- No live impersonation session switching.
- No SSO/SCIM.
- No self-serve public marketplace launch.
- No guarantee of live map movement or guaranteed ETA accuracy.

## Must Validate Before Demo

Run:

```bash
pnpm rehearsal:verify-staging
```

Confirm:
- staging is deployed from latest `main`
- migrations are applied
- release verification passes
- paid-delivery proof passes
- required-auth smoke passes `7/7`
- stored validation evidence is fresh
- `/admin/release-readiness` is `READY`
- proof screenshots are available and reviewed
- smoke credentials work for admin, business, driver, and fleet-manager paths
- notification env status is known
- known limitations have been reviewed by the presenter

## Route Walkthrough

Recommended controlled demo route order:

1. `/` - public product story and proof-backed positioning.
2. `/pricing` - controlled pilot packages.
3. `/demo/request` - persisted commercial intake.
4. `/admin/demo-requests` - admin follow-up workflow.
5. `/admin/release-readiness` - readiness verdict.
6. `/admin/validation-evidence` - stored evidence records.
7. `/admin/command` - cross-org operational posture.
8. `/admin/pilots` - pilot workspace and readiness posture.
9. `/app/restaurant` - merchant menu operations, history, and rollback.
10. `/restaurants/[slug]` - public ordering route.
11. `/app/jobs` and `/app/jobs/[jobId]` - job lifecycle and dispatch governance.
12. `/fleet` - fleet readiness and driver-company workspace.
13. `/app/finance` - business finance review posture.
14. `/admin/finance` - admin finance review visibility.
15. `/admin/dispatch-audit` - assignment and override audit.
16. `/admin/governance` - enterprise access controls.
17. `/admin/operational-resets` - non-destructive staging/demo reset controls.

## Latest Proof and Evidence Approach

ShipWright uses evidence rather than slide-only claims:

- `pnpm rehearsal:verify-staging` runs release verification, paid-delivery proof, required-auth smoke, and smoke evidence recording.
- `/admin/validation-evidence` displays stored evidence records for admin review.
- `/admin/release-readiness` turns evidence freshness and status into a single readiness verdict.
- Paid-delivery proof records order/job/payment/POD identifiers for presenter reference.
- Local proof JSON artifacts stay uncommitted by default.
- Public proof screenshots are reviewed staging captures, not production customer claims.

## Presenter Positioning

Use this framing:

> ShipWright is controlled-pilot ready. It gives merchants, operators, fleets, and platform admins a shared operating record from order to proof, with human-reviewed support, dispatch, finance, governance, and release-readiness controls.

Avoid:
- claiming autonomous operations
- claiming payout/refund automation
- claiming production customer traction unless separately verified
- treating staging proof data as customer metrics
