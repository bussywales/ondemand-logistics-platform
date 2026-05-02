# Support Escalation

## Trigger
- The current operator cannot safely resolve the incident with the available product controls and playbooks.

## How to identify it in ShipWright
- Repeated recovery attempts do not change the underlying state.
- Admin shows broader platform risk.
- Payment, job, notification, or driver state appears internally inconsistent.

## Immediate operator action
1. Stop repeating the same mutation without new evidence.
2. Gather the minimum evidence bundle.
3. Escalate to the named owner with the exact blocker and desired decision.
4. Keep customer and restaurant communication factual while escalation is in progress.

## Customer/restaurant communication guidance
- State that the issue is under active review.
- Do not promise an unsupported refund, delivery, or ETA outcome.

## Admin checks
- Capture overview state, intervention queue item, order state, job state, payment state, and any outbox anomaly.
- Confirm whether this is isolated or cross-org.

## When to cancel/refund
- Only after the escalation owner confirms recovery is no longer appropriate.

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
