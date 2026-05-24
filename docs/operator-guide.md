# ShipWright Operator Guide

Date: 2026-05-24

This guide is for controlled pilot operation and handover. It explains where platform admins, business operators, and fleet managers work, what each surface is for, and which actions remain human-reviewed.

## Operating principle
ShipWright is a command and accountability layer for local commerce operations. It surfaces state, records human decisions, and closes loops with evidence. It does not silently refund, reassign, message, suspend, or delete records.

## Platform admin guide
Primary routes:
- `/admin` - overall admin control plane and links to operational surfaces.
- `/admin/command` - cross-org command posture, support, finance, dispatch, notification, and pilot signals.
- `/admin/release-readiness` - read-only `READY` / `NEEDS_REVIEW` / `BLOCKED` release verdict from stored evidence.
- `/admin/validation-evidence` - stored release verification, paid proof, and smoke evidence.
- `/admin/pilots` - pilot workspaces, readiness stages, owners, and checklists.
- `/admin/demo-requests` - commercial intake, owner assignment, follow-up state, and notes.
- `/admin/notifications` - notification configuration diagnostics and test event controls.
- `/admin/analytics` - first-party public funnel analytics.
- `/admin/users`, `/admin/orgs`, `/admin/governance` - identity, access, invitations, status controls, suspension, and audit.
- `/admin/finance` - cross-org finance review visibility.
- `/admin/dispatch-audit` - read-only manual dispatch decision history.
- `/admin/menu-history` - read-only cross-org menu change history.
- `/admin/operational-resets` - non-destructive staging/demo reset preview and selected execution.
- `/admin/fleets` - driver-company organisation and fleet-driver membership management.

Common admin actions:
- Run `pnpm rehearsal:verify-staging` before demos/releases.
- Confirm `/admin/release-readiness` is `READY` before controlled demos.
- Review `/admin/validation-evidence` if readiness is stale, missing, or failed.
- Use `/admin/demo-requests` to assign owners and record follow-up state.
- Use `/admin/notifications` to test configured webhook/email channels without exposing secrets.
- Use `/admin/governance` for reversible suspension/reactivation only with reason and confirmation.
- Use `/admin/operational-resets` only after previewing selected records and confirming no proof/order/job/payment mutation.

What not to do:
- Do not treat skipped notification delivery as proof of outbound email/webhook success.
- Do not mutate finance, dispatch, menu, or support records outside their audited workflows.
- Do not present impersonation as active; only preview/audit preparation exists.

## Business operator guide
Primary routes:
- `/app` - daily briefing, pilot guardrails, and operational posture.
- `/app/orders` - order queue and order-linked support escalation logs.
- `/app/jobs` and `/app/jobs/[jobId]` - job detail, dispatch governance, assignment audit, and support context.
- `/app/restaurant` - merchant profile, menu setup, item editing, availability, ordering, menu history, and rollback.
- `/app/payments` - operational payment-risk lens.
- `/app/finance` - settlement visibility and persistent finance review workflow.
- `/app/reports/end-of-day` - deterministic closeout posture.
- `/app/settings/team` - team members, pending invites, resend/cancel invite actions, and access history.
- `/app/updates` - operator-facing product updates.

Common business actions:
- Keep menu item price, visibility, and section ordering current before public ordering.
- Use menu history to inspect changes; only rollback prepared changes after preview and typed confirmation.
- Log support/escalation notes against orders/jobs and close them with resolution context.
- Create finance reviews from refund-review candidates when manual review is required.
- Resolve finance reviews only after external/human financial decisions are documented.
- Use dispatch governance notes or overrides only with a clear reason and confirmation.

What not to do:
- Do not assume a finance review issues a refund.
- Do not use dispatch override controls as automation or driver scoring.
- Do not close support or finance records without useful resolution notes.

## Fleet manager guide
Primary routes:
- `/fleet` - fleet overview, readiness counts, driver list, and pending invite summary.
- `/fleet/drivers/[driverId]` - driver readiness detail, active/recent work, vehicle/availability, and recommended next action.
- `/fleet/team` - fleet members and invitations, where permitted by role.

Common fleet actions:
- Review readiness before a controlled dispatch rehearsal.
- Invite drivers or dispatch/compliance members only within the driver-company organisation.
- Use readiness context as compliance/operations information, not punitive scoring.

What not to do:
- Do not treat fleet readiness as automatic dispatch priority.
- Do not suspend, penalise, or financially affect drivers from readiness views.

## Release and validation checks
Before controlled demos/releases run:

```bash
pnpm rehearsal:verify-staging
```

Then confirm:
- `/admin/release-readiness` is `READY`
- `/admin/validation-evidence` shows fresh release verification, paid-delivery proof, and required-auth smoke evidence
- latest proof IDs are recorded for order/job/payment/POD reference
- proof artifacts under `docs/proofs/` are not committed

## Handling support escalations
1. Open the linked order or job.
2. Add a support/escalation record with category, severity, owner, and note.
3. Update status as human follow-up progresses.
4. Resolve or cancel only with resolution note, action, and reason.
5. Review the append-only history if there is any dispute or handover need.

## Handling finance reviews
1. Open `/app/finance` and review computed candidates and existing review records.
2. Create or open a finance review for refund/payment mismatch cases.
3. Assign an owner and move the review through `OPEN`, `IN_REVIEW`, or `WAITING_SUPPORT`.
4. Resolve/cancel only with typed confirmation and resolution context.
5. Do not expect provider mutation; any real refund/payout action remains external and human-reviewed.

## Handling dispatch exceptions
1. Open the job detail.
2. Review current assignment, courier affiliation, readiness, and audit history.
3. Add a manual recovery note or use assignment override only with reason, idempotency, and typed confirmation where required.
4. Use `/admin/dispatch-audit` for cross-org investigation; admins do not trigger autonomous reassignment from the audit view.
