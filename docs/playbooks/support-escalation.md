# Support Escalation

## Trigger
- The current operator cannot safely resolve the incident with the available product controls and playbooks.

## How to identify it in ShipWright
- Repeated recovery attempts do not change the underlying state.
- Admin shows broader platform risk.
- Payment, job, notification, or driver state appears internally inconsistent.
- The order or job detail support log shows an unresolved escalation, missing owner, or waiting-on-party status.

## Immediate operator action
1. Stop repeating the same mutation without new evidence.
2. Gather the minimum evidence bundle.
3. Add or update the support/escalation log on the linked order or job.
4. Set category, severity, status, follow-up owner, and contact-required flags.
5. Escalate to the named owner with the exact blocker and desired decision.
6. Keep customer and restaurant communication factual while escalation is in progress.
7. Use any incident-summary draft as a starting point only. Review and edit it before sending.

## Customer/restaurant communication guidance
- State that the issue is under active review.
- Do not promise an unsupported refund, delivery, or ETA outcome.

## Admin checks
- Capture overview state, intervention queue item, order state, job state, payment state, and any outbox anomaly.
- Confirm whether this is isolated or cross-org.
- Check `/admin/command` for open or high-severity support escalations across organisations.

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
- whether draft communication was used and what was edited before it was sent

## Product controls available
- Business operators can create and update support/escalation records from order and job detail pages.
- Platform admins can review open cross-org escalation records from Admin Command Intelligence.
- There is no delete endpoint in v1.
- The log does not send messages, refund, cancel, assign drivers, or close incidents automatically.
