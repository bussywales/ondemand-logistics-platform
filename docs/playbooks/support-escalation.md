# Support Escalation

## Trigger
- The current operator cannot safely resolve the incident with the available product controls and playbooks.

## How to identify it in ShipWright
- Repeated recovery attempts do not change the underlying state.
- Admin shows broader platform risk.
- Payment, job, notification, or driver state appears internally inconsistent.
- The order or job detail support log shows an unresolved escalation, missing owner, or waiting-on-party status.
- The order or job detail support history shows a reopen event, repeated status changes, or incomplete closeout context.
- Daily briefing or end-of-day report shows `Human follow-up open` or `Review support escalation`.

## Immediate operator action
1. Stop repeating the same mutation without new evidence.
2. Gather the minimum evidence bundle.
3. Add or update the support/escalation log on the linked order or job.
4. Set category, severity, status, follow-up owner, and contact-required flags.
5. Escalate to the named owner with the exact blocker and desired decision.
6. Keep customer and restaurant communication factual while escalation is in progress.
7. Use any incident-summary draft as a starting point only. Review and edit it before sending.
8. When the issue is complete, close the support record with a final action, resolution reason, and resolution note.
9. Review the support history timeline before closing or reopening so the final note reflects what changed and why.

## Customer/restaurant communication guidance
- State that the issue is under active review.
- Do not promise an unsupported refund, delivery, or ETA outcome.

## Admin checks
- Capture overview state, intervention queue item, order state, job state, payment state, and any outbox anomaly.
- Confirm whether this is isolated or cross-org.
- Check `/admin/command` for open or high-severity support escalations across organisations.
- Confirm whether the escalation is already counted in daily briefing or end-of-day closeout before creating duplicate follow-up.

## When to cancel/refund
- Only after the escalation owner confirms recovery is no longer appropriate.
- Record the decision context in the support/escalation log before acting through any separate refund or cancellation flow.

## Escalation owner
- Platform admin first for platform/system issues.
- Product/engineering owner if the issue is clearly a product defect or release regression.

## Evidence to record
- order id
- job id
- payment id
- timeline facts
- exact error or contradiction observed
- person escalated to
- escalation timestamp
- support/escalation log id, if created
- support history events that changed status, owner, contact flags, or resolution context
- whether draft communication was used and what was edited before it was sent
- final action taken
- resolution reason
- resolution note and closeout timestamp

## Resolution and closeout
- Closing a support record as `RESOLVED` or `CANCELLED` requires a resolution note.
- Operators should record the final human action, such as customer update, dispatch retry, driver reassignment, payment review, refund review, manual cancellation, or no action required.
- Reopening a closed record clears final-resolution metadata in v1 so unresolved records do not show stale closeout evidence.
- Every create, meaningful update, closeout, cancellation, and reopen writes an append-only support history event.
- The support history timeline is visible on linked order and job detail pages so operators can see who changed what, when, and why.
- The closeout log is audit context only. It does not send messages, refund, cancel, retry dispatch, assign drivers, or close incidents automatically.

## Product controls available
- Business operators can create and update support/escalation records from order and job detail pages.
- Business operators can resolve or cancel support records from order and job detail pages after entering closeout context.
- Business operators can review append-only support history from order and job detail pages.
- Platform admins can review open cross-org escalation records from Admin Command Intelligence.
- Platform admins can read support history through admin support endpoints; there is no admin event mutation path in v1.
- Admin Command and the end-of-day report show unresolved support follow-up and support records closed today.
- Daily briefing and end-of-day report include unresolved support records as operator follow-up actions.
- There is no delete endpoint in v1.
- There is no manual event creation endpoint in v1; history is system-created from support create/update operations.
- The log does not send messages, refund, cancel, assign drivers, or close incidents automatically.
