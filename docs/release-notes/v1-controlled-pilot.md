# ShipWright v1 Controlled Pilot Readiness Pack

Date: 2026-05-24

## Executive summary
ShipWright v1 is ready for controlled pilot demonstrations and tightly managed early operations. The platform now connects public commercial storytelling, demo request capture, pilot readiness, release evidence, merchant operations, support escalation, finance review, dispatch governance, fleet readiness, and enterprise access controls into one auditable operating spine.

This is not an unattended public marketplace launch. The release is intentionally human-reviewed: operators, platform admins, and fleet managers use ShipWright to see risk, record decisions, close loops, and prove readiness before expanding usage.

## What is ready
- Public site, pricing, and demo request flow for controlled pilot interest.
- Demo request persistence, admin follow-up workflow, notification diagnostics, and first-party public funnel analytics.
- Pilot workspaces, readiness checklists, guardrails, rehearsal cockpit, validation evidence, and release-readiness dashboard.
- One-command release rehearsal through `pnpm rehearsal:verify-staging`.
- Merchant menu operations: profile/menu setup, item price editing, availability controls, section/item reordering, audit history, rollback readiness, and business-scoped rollback.
- Support escalation lifecycle: logging, ownership, status updates, resolution/closeout, and append-only history.
- Finance visibility and persistent finance review records for refund/payment review without provider mutation.
- Dispatch governance and assignment audit visibility without autonomous reassignment.
- Fleet organisation foundation, fleet workspace, driver detail, team invites, and readiness visibility.
- IAM invite lifecycle, access audit history, admin user/org management, suspension controls, and impersonation preview foundation.
- Operational reset tools for non-destructive staging/demo tidy-up.

## Intentionally human-reviewed
- Pilot go-live and rehearsal readiness decisions.
- Support follow-up, customer/merchant/courier contact, escalation resolution, and closeout notes.
- Finance review decisions, including refund-review candidates and manual resolution notes.
- Dispatch recovery, assignment override, and manual recovery notes.
- Menu rollback preview and execution.
- Organisation/user suspension and reactivation.
- Operational reset preview, per-record selection, and execution.
- Demo request qualification and commercial follow-up.

## Not automated in v1
- No automated refunds or payment-provider refund execution.
- No payout or settlement automation.
- No CRM sync or automated sales follow-up.
- No autonomous dispatch override, courier scoring, or courier suspension.
- No automated customer, merchant, or courier messaging from support records.
- No live impersonation or support session switching.
- No SSO/SCIM.
- No open self-serve onboarding or unmanaged public launch posture.

## Known limitations
The canonical limitations list is `docs/known-limitations.md`. Use it during demos, investor walkthroughs, pilot handover, and release review.

Key limitations to keep visible:
- external notification delivery requires webhook/email env configuration and verified provider setup
- proof JSON artifacts remain local and uncommitted unless explicitly exported
- staging web deployment may require manual Vercel redeploy if Git integration stalls
- public site visuals use staging-safe product visuals, not customer logos or production metrics

## Validation command
Run the full controlled-pilot readiness gate from the repo root:

```bash
pnpm rehearsal:verify-staging
```

The wrapper runs, in order:
1. `RECORD_VALIDATION_EVIDENCE=true pnpm release:verify-staging`
2. `RECORD_VALIDATION_EVIDENCE=true pnpm proof:staging-paid-delivery`
3. `SMOKE_REQUIRE_AUTH=true pnpm --filter @shipwright/web test:smoke`
4. stored evidence recording for required-auth smoke

It exits non-zero on the first failed required step.

## Latest evidence check approach
Before a controlled demo or pilot rehearsal, confirm:
- `/admin/release-readiness` is `READY`, or any `NEEDS_REVIEW` posture is explicitly accepted and explained
- `/admin/validation-evidence` shows fresh release verification, paid-delivery proof, and required-auth smoke evidence
- the selected pilot rehearsal cockpit shows current validation posture, not missing/stale evidence
- latest paid-delivery proof output includes order, job, payment, and POD identifiers where available
- proof artifacts under `docs/proofs/` remain local and uncommitted

## Deployment notes
- Apply migrations before validating a deploy. A stale schema can break authenticated routes even when public routes pass.
- `pnpm release:verify-staging` must catch release-critical schema readiness before smoke is trusted.
- Staging web deployment should be checked against the expected commit. If Vercel/GitHub integration stalls, redeploy staging web before declaring readiness.
- Notification, email, webhook, smoke, and proof secrets must stay in local or platform environment configuration. Do not commit secrets.
- The admin UI reads stored validation evidence only. It does not run release, proof, smoke, refund, payout, dispatch, or reset commands.
